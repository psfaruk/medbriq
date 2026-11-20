"use client";

/**
 * Settings — account details (name/phone via PATCH /api/v1/auth/me),
 * language switcher, notification preference toggles (simulated), sign out,
 * and demo environment info.
 */

import { useState } from "react";
import {
  Bell,
  Globe,
  LogOut,
  MonitorSmartphone,
  Save,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  DemoNotice,
  PageHeader,
  SectionCard,
} from "@/components/app/shared/ui-kit";
import { apiPatch } from "@/lib/api-client";
import { useAppStore } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import { LANGS } from "@/lib/i18n";
import { errMessage, normalizeBdPhoneLocal } from "../helpers";
import type { SessionUser } from "@/lib/types";

const NOTIFICATION_PREFS = [
  {
    key: "newBookings",
    label: "New booking requests",
    hint: "Alerts when a patient requests or books a slot",
    initial: true,
  },
  {
    key: "cancellations",
    label: "Cancellations and no-shows",
    hint: "Alerts when a patient cancels an upcoming appointment",
    initial: true,
  },
  {
    key: "reviews",
    label: "New patient reviews",
    hint: "Alerts when a patient leaves a review after a visit",
    initial: false,
  },
] as const;

export default function SettingsSection() {
  const { user, setUser, lang, setLang, logout } = useAppStore();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NOTIFICATION_PREFS.map((p) => [p.key, p.initial])
    )
  );

  const saveAccount = async () => {
    if (name.trim().length < 2) {
      setAccountError("Name must be at least 2 characters.");
      return;
    }
    const trimmedPhone = phone.trim();
    const normalized = trimmedPhone ? normalizeBdPhoneLocal(trimmedPhone) : null;
    if (trimmedPhone && !normalized) {
      setAccountError("Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX).");
      return;
    }
    setAccountError(null);
    setSaving(true);
    try {
      const data = await apiPatch<{ user: SessionUser }>("/api/v1/auth/me", {
        name: name.trim(),
        phone: normalized,
      });
      setUser(data.user);
      toast({ title: "Account updated" });
    } catch (err) {
      setAccountError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Account details, language and notification preferences."
      />

      {/* Account */}
      <SectionCard title="Account">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Full name</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-phone">Mobile number</Label>
            <Input
              id="s-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
            />
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">
              Signed in as {user?.email} ({user?.provider === "credentials" ? "email + password" : user?.provider}).
              {user?.phoneVerified ? " Phone verified." : " Phone not verified."}
            </p>
          </div>
        </div>
        {accountError ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">
            {accountError}
          </p>
        ) : null}
        <div className="mt-4">
          <Button onClick={saveAccount} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save account"}
          </Button>
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard title="Language / ভাষা">
        <div className="grid gap-3 sm:grid-cols-2">
          {LANGS.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                aria-pressed={active}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {l.native}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {l.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Interface labels (navigation, statuses) switch immediately; most
          dashboard content is in English.
        </p>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        title="Notification preferences"
        action={
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            Simulated in demo
          </span>
        }
      >
        <ul className="space-y-1">
          {NOTIFICATION_PREFS.map((pref) => (
            <li
              key={pref.key}
              className="flex items-center justify-between gap-4 rounded-xl px-1 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {pref.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {pref.hint}
                </p>
              </div>
              <Switch
                checked={prefs[pref.key]}
                onCheckedChange={(v) =>
                  setPrefs((prev) => ({ ...prev, [pref.key]: v }))
                }
                aria-label={pref.label}
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Toggles are local to this demo session — in-app notifications (the
          bell in the top bar) are always delivered.
        </p>
      </SectionCard>

      <Separator />

      {/* Sign out + demo info */}
      <SectionCard title="Session">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </SectionCard>

      <DemoNotice>
        <strong className="text-foreground">Demo account:</strong>{" "}
        doctor@medbriq.dev / Doctor@123 (Dr. Ayesha Rahman, medicine &amp;
        diabetology).{" "}
        <span className="mt-1 flex items-center gap-1.5">
          <MonitorSmartphone className="h-3 w-3" />
          Other demo logins: patient@medbriq.dev / Patient@123 ·
          hospital@medbriq.dev / Hospital@123 · admin@medbriq.dev /
          Admin@Medbriq123
        </span>
      </DemoNotice>
    </div>
  );
}
