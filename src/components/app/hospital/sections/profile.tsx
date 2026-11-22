"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { apiGet, apiPut, ApiCallError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ErrorState,
  LoadingCard,
  PageHeader,
  SectionCard,
  VerificationBadge,
  useT,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import type { HospitalProfile } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

type ProfileForm = {
  name: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  about: string;
};

function formFromProfile(p: HospitalProfile): ProfileForm {
  return {
    name: p.name ?? "",
    city: p.city ?? "",
    address: p.address ?? "",
    phone: p.phone ?? "",
    website: p.website ?? "",
    about: p.about ?? "",
  };
}

export default function ProfileSection() {
  const { t } = useT();
  const { toast } = useToast();
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ profile: HospitalProfile }>("/api/v2/hospital/profile")
      .then((d) => {
        if (cancelled) return;
        setProfile(d.profile);
        setForm(formFromProfile(d.profile));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiCallError ? err.message : ERROR_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("hospitalNav.profile")} />
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }
  if (!profile || !form) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("hospitalNav.profile")} />
        <LoadingCard rows={6} />
      </div>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(formFromProfile(profile));
  const nameValid = form.name.trim().length >= 3;
  const cityValid = form.city.trim().length >= 2;
  const websiteValid =
    form.website.trim() === "" || /^https?:\/\/\S+\.\S+/.test(form.website.trim());
  const canSave = dirty && nameValid && cityValid && websiteValid && !saving;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const d = await apiPut<{ profile: HospitalProfile }>(
        "/api/v2/hospital/profile",
        {
          name: form.name.trim(),
          city: form.city.trim(),
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
          website: form.website.trim() || undefined,
          about: form.about.trim() || undefined,
        }
      );
      setProfile(d.profile);
      setForm(formFromProfile(d.profile));
      toast({ title: "Profile saved", description: d.profile.name });
    } catch (err) {
      toast({
        title: "Could not save profile",
        description: err instanceof ApiCallError ? err.message : ERROR_FALLBACK,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard
      .writeText(profile.slug)
      .then(() => {
        setCopied(true);
        toast({ title: "Slug copied to clipboard" });
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast({ title: "Could not copy", variant: "destructive" }));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hospitalNav.profile")}
        subtitle="Details shown on your public hospital page."
        action={<VerificationBadge status={profile.verificationStatus} />}
      />

      {/* Verification status (read-only) */}
      <SectionCard title="Verification status">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <VerificationBadge status={profile.verificationStatus} />
            <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
              {profile.verificationStatus === "VERIFIED"
                ? "Your hospital is verified and listed publicly on Find Medi Doctor. Admins re-review after material profile changes."
                : `Verification ${profile.verificationStatus
                    .replaceAll("_", " ")
                    .toLowerCase()} — your public profile activates after admin review.`}
            </p>
          </div>
        </div>
        {profile.verificationNote ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Admin note: {profile.verificationNote}
          </p>
        ) : null}
      </SectionCard>

      {/* Editable profile form */}
      <SectionCard title="Hospital information">
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hp-name">Hospital name</Label>
              <Input
                id="hp-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                maxLength={120}
                required
              />
              {!nameValid ? (
                <p className="text-[11px] text-destructive">
                  Name must be at least 3 characters.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hp-city">City</Label>
              <Input
                id="hp-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                maxLength={80}
                required
              />
              {!cityValid ? (
                <p className="text-[11px] text-destructive">
                  City must be at least 2 characters.
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hp-address">Address</Label>
              <Input
                id="hp-address"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="House / road / area"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hp-phone">Phone</Label>
              <Input
                id="hp-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+880 2-XXXXXXX"
                maxLength={30}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hp-website">
              Website <span className="text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Input
              id="hp-website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
              maxLength={200}
            />
            {!websiteValid ? (
              <p className="text-[11px] text-destructive">
                Website must start with http:// or https://
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hp-about">
              About <span className="text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Textarea
              id="hp-about"
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="Short description patients see on your public page"
              rows={4}
              maxLength={1000}
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-4">
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForm(formFromProfile(profile))}
              >
                {t("common.cancel")}
              </Button>
            ) : null}
            <Button type="submit" disabled={!canSave}>
              {saving ? "Saving…" : t("common.saveChanges")}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Public slug (read-only) */}
      <SectionCard title="Public profile">
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Your public hospital page is reachable at{" "}
            <span className="font-medium text-foreground">
              /hospitals/{profile.slug}
            </span>{" "}
            — the slug is assigned by the system and cannot be changed.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={`/hospitals/${profile.slug}`} aria-label="Public profile URL" className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={copySlug}
              aria-label="Copy slug"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Separator />
          <p className="text-[11px] text-muted-foreground">
            Signed in as the hospital manager — profile edits above sync to the
            public page immediately.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
