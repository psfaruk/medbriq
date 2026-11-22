"use client";

/**
 * My Profile — read the public doctor detail (bio, fees, languages, video,
 * approval mode), edit via PATCH /api/v1/doctor/profile, and manage BMDC
 * verification status.
 */

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  GraduationCap,
  MapPin,
  Save,
  ShieldCheck,
  Stethoscope,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DemoNotice,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  SectionCard,
  Stars,
  UserAvatar,
  VerificationBadge,
} from "@/components/app/shared/ui-kit";
import { apiGet, apiPatch } from "@/lib/api-client";
import { useAppStore } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import type { DoctorDetail } from "@/lib/types";
import { errMessage } from "../helpers";

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
];

type ProfileForm = {
  bio: string;
  experienceYears: string;
  consultationFee: string;
  followUpFee: string;
  city: string;
  chamberAddress: string;
  languages: string[];
  supportsVideo: boolean;
  requiresApproval: boolean;
};

function toForm(d: DoctorDetail): ProfileForm {
  return {
    bio: d.bio ?? "",
    experienceYears: String(d.experienceYears),
    consultationFee: String(d.consultationFee),
    followUpFee: String(d.followUpFee),
    city: d.city,
    chamberAddress: d.chamberAddress ?? "",
    languages: d.languages,
    supportsVideo: d.supportsVideo,
    requiresApproval: d.requiresApproval,
  };
}

export default function ProfileSection() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const slug = user?.doctorSlug;

  const [detail, setDetail] = useState<DoctorDetail | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    apiGet<DoctorDetail>(`/api/v1/doctors/${slug}`)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setForm(toForm(d));
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(errMessage(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, tick]);

  const save = async () => {
    if (!form) return;
    const experience = Number(form.experienceYears);
    const consultFee = Number(form.consultationFee);
    const fuFee = Number(form.followUpFee);
    if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
      setFormError("Experience must be a whole number of years (0–60).");
      return;
    }
    if (!Number.isFinite(consultFee) || consultFee <= 0) {
      setFormError("Consultation fee must be greater than zero.");
      return;
    }
    if (!Number.isFinite(fuFee) || fuFee < 0) {
      setFormError("Follow-up fee cannot be negative.");
      return;
    }
    if (form.city.trim().length < 2) {
      setFormError("City must be at least 2 characters.");
      return;
    }
    if (form.languages.length === 0) {
      setFormError("Select at least one language.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const data = await apiPatch<{
        doctor: {
          verificationStatus: string;
          verificationNote: string | null;
          supportsVideo: boolean;
          requiresApproval: boolean;
        };
      }>("/api/v1/doctor/profile", {
        bio: form.bio.trim() ? form.bio.trim() : null,
        experienceYears: experience,
        consultationFee: consultFee,
        followUpFee: fuFee,
        city: form.city.trim(),
        chamberAddress: form.chamberAddress.trim()
          ? form.chamberAddress.trim()
          : null,
        languages: form.languages.join(","),
        supportsVideo: form.supportsVideo,
        requiresApproval: form.requiresApproval,
      });
      setVerificationNote(data.doctor.verificationNote);
      toast({
        title: "Profile updated",
        description: "Your public profile reflects the changes immediately.",
      });
      reload();
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitForVerification = async () => {
    try {
      await apiPatch("/api/v1/doctor/profile", {
        regNumber: detail?.regNumber ?? undefined,
      });
      toast({
        title: "Submitted for admin review",
        description:
          "An admin will verify your BMDC registration. You can keep working meanwhile.",
      });
    } catch (err) {
      toast({
        title: "Could not submit",
        description: errMessage(err),
        variant: "destructive",
      });
    }
  };

  if (!slug) {
    return (
      <ErrorState message="Doctor profile not linked to this account." />
    );
  }

  if (loading && !detail) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={4} />
        <LoadingCard rows={4} />
      </div>
    );
  }

  if (error && !detail) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const verified = detail?.verificationStatus === "VERIFIED";

  return (
    <div className="space-y-5">
      <PageHeader
        title="My profile"
        subtitle="This is what patients see on your public profile."
      />

      {/* Identity card */}
      <SectionCard>
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar name={user?.name ?? "Doctor"} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {user?.name}
              </h2>
              <VerificationBadge status={detail?.verificationStatus ?? "PENDING"} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {detail?.regNumber ? (
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  BMDC {detail.regNumber}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {detail?.city}
              </span>
              {detail?.experienceYears != null ? (
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {detail.experienceYears} yrs experience
                </span>
              ) : null}
              <Stars rating={detail?.ratingAvg ?? null} count={detail?.ratingCount} />
            </div>
            {detail?.specialties?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detail.specialties.map((s) => (
                  <Badge
                    key={s.slug}
                    variant="outline"
                    className="bg-primary-soft text-primary"
                  >
                    <Stethoscope className="mr-1 h-3 w-3" />
                    {s.name}
                  </Badge>
                ))}
              </div>
            ) : null}
            {verificationNote ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Verification note: {verificationNote}
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {/* Edit form */}
      <SectionCard
        title="Practice profile"
        action={
          <Button onClick={save} disabled={saving || !form} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      >
        {form ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-bio">About / bio</Label>
              <Textarea
                id="p-bio"
                rows={4}
                maxLength={2000}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Introduce yourself to patients — qualifications, focus areas, practice style…"
              />
              <p className="text-[11px] text-muted-foreground">
                {form.bio.length}/2000 characters
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-exp">Experience (years)</Label>
                <Input
                  id="p-exp"
                  type="number"
                  min={0}
                  max={60}
                  value={form.experienceYears}
                  onChange={(e) =>
                    setForm({ ...form, experienceYears: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-fee">Consultation fee (৳)</Label>
                <Input
                  id="p-fee"
                  type="number"
                  min={1}
                  value={form.consultationFee}
                  onChange={(e) =>
                    setForm({ ...form, consultationFee: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-fu">Follow-up fee (৳)</Label>
                <Input
                  id="p-fu"
                  type="number"
                  min={0}
                  value={form.followUpFee}
                  onChange={(e) =>
                    setForm({ ...form, followUpFee: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-city">City</Label>
                <Input
                  id="p-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-chamber">Primary chamber address</Label>
              <Input
                id="p-chamber"
                maxLength={200}
                value={form.chamberAddress}
                onChange={(e) =>
                  setForm({ ...form, chamberAddress: e.target.value })
                }
                placeholder="Shown on your public profile"
              />
            </div>

            <div className="space-y-2">
              <Label>Languages you consult in</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const active = form.languages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setForm({
                          ...form,
                          languages: active
                            ? form.languages.filter((c) => c !== lang.code)
                            : [...form.languages, lang.code],
                        })
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 px-3 py-3">
                <div>
                  <Label htmlFor="p-video" className="flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    Video consultations
                  </Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Telehealth requires regulatory approval (DGHS telemedicine
                    guidelines) before activation — chamber visits are fully
                    available meanwhile.
                  </p>
                </div>
                <Switch
                  id="p-video"
                  checked={form.supportsVideo}
                  onCheckedChange={(v) =>
                    setForm({ ...form, supportsVideo: v })
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 px-3 py-3">
                <div>
                  <Label htmlFor="p-approval">Approval mode</Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {form.requiresApproval
                      ? "ON — new bookings wait for your approval before they are confirmed."
                      : "OFF — bookings are confirmed instantly for available slots."}
                  </p>
                </div>
                <Switch
                  id="p-approval"
                  checked={form.requiresApproval}
                  onCheckedChange={(v) =>
                    setForm({ ...form, requiresApproval: v })
                  }
                />
              </div>
            </div>

            {formError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium break-words text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      {/* BMDC credentials */}
      <SectionCard title="BMDC credentials">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {detail?.regNumber ?? "No registration number on file"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck
                className={`h-3.5 w-3.5 ${verified ? "text-emerald-600" : "text-amber-500"}`}
              />
              {verified
                ? "Verified — your badge is visible to patients."
                : `Status: ${detail?.verificationStatus?.replaceAll("_", " ") ?? "unverified"} — unverified doctors do not appear in patient search.`}
            </p>
          </div>
          {!verified ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={submitForVerification}
            >
              <ShieldCheck className="h-4 w-4" />
              Submit for verification
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
            >
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </div>
        {detail?.feeStructure ? (
          <p className="mt-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            Note: fees shown on your profile come from Fee settings (currently
            new patient <Money amount={detail.feeStructure.newPatientFee} />,
            returning <Money amount={detail.feeStructure.returningPatientFee} />
            ) — manage them in the Fee settings section.
          </p>
        ) : null}
      </SectionCard>

      <DemoNotice>
        <strong className="text-foreground">Verification.</strong> Newly
        registered doctors start unverified until an admin approves their
        BMDC registration — verified profiles show the trust badge.
      </DemoNotice>
    </div>
  );
}
