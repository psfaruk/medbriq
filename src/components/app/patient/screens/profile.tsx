"use client";

/**
 * profile.tsx — account settings, language, notification preferences,
 * privacy, help & support tickets, demo info (with sandbox disclaimer +
 * emergency guidance) and sign-out (new style).
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Info,
  Languages,
  Loader2,
  LogOut,
  Mail,
  Phone,
  PhoneCall,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/app-state";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import {
  DemoNotice,
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  SectionCard,
  UserAvatar,
  useT,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import { useApiData } from "./shared";

type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};

function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium", TICKET_STATUS_STYLES[status] ?? "")}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export default function ProfileScreen() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setLang = useAppStore((s) => s.setLang);
  const logout = useAppStore((s) => s.logout);

  // ── account form ──────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── change password (POST /api/v1/auth/password) ──────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── support ───────────────────────────────────────────────────
  const tickets = useApiData<{ items: SupportTicket[] }>(
    () => apiGet<{ items: SupportTicket[] }>("/api/v2/support"),
    []
  );
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [message, setMessage] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // ── notification prefs (UI-only until the backend ships them) ─
  const [reminders, setReminders] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    try {
      const body: Record<string, unknown> = {};
      if (name.trim() !== (user?.name ?? "")) body.name = name.trim();
      if (phone.trim() !== (user?.phone ?? "")) body.phone = phone.trim();
      if (Object.keys(body).length === 0) {
        toast({ title: t("profile.noChanges") });
        return;
      }
      const res = await apiPatch<{ user: typeof user }>("/api/v1/auth/me", body);
      setUser(res.user ?? null);
      toast({ title: t("profile.updated") });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t("common.error"));
      toast({
        title: t("profile.updateFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const togglePasswordSection = () => {
    if (pwOpen) {
      // Cancel — discard any drafted passwords and the inline error.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
    }
    setPwOpen(!pwOpen);
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (user?.provider === "credentials" && currentPassword.length === 0) {
      setPasswordError(
        lang === "bn"
          ? "আপনার বর্তমান পাসওয়ার্ড লিখুন।"
          : "Enter your current password."
      );
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(
        lang === "bn"
          ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।"
          : "Password must be at least 8 characters."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        lang === "bn"
          ? "নতুন পাসওয়ার্ড দুটি মেলেনি।"
          : "New passwords do not match."
      );
      return;
    }
    setSavingPassword(true);
    try {
      // Google / phone accounts (no stored password) may set an initial
      // password without confirming a current one — the endpoint treats a
      // missing currentPassword that way, so only send it when filled in.
      await apiPost("/api/v1/auth/password", {
        ...(currentPassword ? { currentPassword } : {}),
        newPassword,
      });
      toast({
        title: lang === "bn" ? "পাসওয়ার্ড আপডেট হয়েছে" : "Password updated",
        description:
          lang === "bn"
            ? "নতুন পাসওয়ার্ড এখন সক্রিয় — অন্য ডিভাইস থেকে সাইন আউট করা হয়েছে।"
            : "Your new password is active — other devices were signed out.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwOpen(false);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : t("common.error")
      );
      toast({
        title: lang === "bn" ? "পাসওয়ার্ড পরিবর্তন হয়নি" : "Password change failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setTicketError(t("profile.ticketInvalid"));
      return;
    }
    setSendingTicket(true);
    setTicketError(null);
    try {
      await apiPost("/api/v2/support", {
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      toast({
        title: t("profile.ticketSent"),
        description: t("profile.ticketSentHint"),
      });
      setSubject("");
      setMessage("");
      tickets.reload();
    } catch (err) {
      setTicketError(
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      setSendingTicket(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("profile.title")} />

      {/* ── user card ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user?.name ?? "Guest"}
            photoUrl={user?.avatarUrl}
            className="h-16 w-16"
          />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground">
              {user?.name ?? "Guest"}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3" aria-hidden="true" />
              {user?.email}
            </p>
            {user?.phone ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {user.phone}
              </p>
            ) : null}
            {user?.phoneVerified ? (
              <Badge
                variant="outline"
                className="mt-1.5 gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {t("profile.phoneVerified")}
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── account ─────────────────────────────────────────────── */}
      <SectionCard title={t("profile.account")}>
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-name">{t("auth.name")}</Label>
              <Input
                id="pf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-phone">{t("auth.phone")}</Label>
              <Input
                id="pf-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
          {profileError ? (
            <p className="text-xs font-medium break-words text-destructive" role="alert">
              {profileError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile || !user}>
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("common.saveChanges")}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* ── change password ───────────────────────────────────── */}
      <SectionCard
        title={lang === "bn" ? "পাসওয়ার্ড পরিবর্তন" : "Change password"}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={togglePasswordSection}
            aria-expanded={pwOpen}
          >
            {pwOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            {pwOpen
              ? lang === "bn"
                ? "বাতিল"
                : "Cancel"
              : lang === "bn"
                ? "পরিবর্তন"
                : "Change"}
          </Button>
        }
      >
        {pwOpen ? (
          <form onSubmit={changePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">
                {lang === "bn" ? "বর্তমান পাসওয়ার্ড" : "Current password"}
                {user?.provider !== "credentials" ? (
                  <span className="text-muted-foreground">
                    {" "}
                    ({lang === "bn" ? "ঐচ্ছিক" : "optional"})
                  </span>
                ) : null}
              </Label>
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                required={user?.provider === "credentials"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
              {user?.provider !== "credentials" ? (
                <p className="text-[11px] text-muted-foreground">
                  {lang === "bn"
                    ? "আগে কখনো পাসওয়ার্ড সেট না করে থাকলে খালি রাখুন — এটি আপনার প্রথম পাসওয়ার্ড হবে।"
                    : "Leave blank if you have never set a password — this sets your first one."}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">
                  {lang === "bn" ? "নতুন পাসওয়ার্ড" : "New password"}
                </Label>
                <Input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={
                    lang === "bn" ? "কমপক্ষে ৮ অক্ষর" : "At least 8 characters"
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">
                  {lang === "bn" ? "নতুন পাসওয়ার্ড নিশ্চিত করুন" : "Confirm new password"}
                </Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            {passwordError ? (
              <p className="text-xs font-medium break-words text-destructive" role="alert">
                {passwordError}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPassword || !user}>
                {savingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {lang === "bn" ? "পাসওয়ার্ড আপডেট করুন" : "Update password"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            {lang === "bn"
              ? "সাইন ইন করার জন্য নতুন পাসওয়ার্ড সেট করুন।"
              : "Set a new password for signing in."}
          </p>
        )}
      </SectionCard>

      {/* ── language ────────────────────────────────────────────── */}
      <SectionCard title={t("profile.language")}>
        <RadioGroup
          value={lang}
          onValueChange={(v) => setLang(v === "bn" ? "bn" : "en")}
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        >
          <label
            htmlFor="lang-en"
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
              lang === "en"
                ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="en" id="lang-en" />
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">English</span>
          </label>
          <label
            htmlFor="lang-bn"
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
              lang === "bn"
                ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="bn" id="lang-bn" />
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">বাংলা</span>
          </label>
        </RadioGroup>
      </SectionCard>

      {/* ── notifications (UI-only) ─────────────────────────────── */}
      <SectionCard title={t("profile.notifications")}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("profile.reminders")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("profile.remindersHint")}
              </p>
            </div>
            <Switch
              checked={reminders}
              onCheckedChange={setReminders}
              aria-label={t("profile.reminders")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("profile.emailUpdates")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("profile.emailUpdatesHint")}
              </p>
            </div>
            <Switch
              checked={emailUpdates}
              onCheckedChange={setEmailUpdates}
              aria-label={t("profile.emailUpdates")}
            />
          </div>
          <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Bell className="mr-1 inline h-3 w-3" aria-hidden="true" />
            {t("profile.prefsLocalNote")}
          </p>
        </div>
      </SectionCard>

      {/* ── privacy ─────────────────────────────────────────────── */}
      <SectionCard title={t("profile.privacy")}>
        <div className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
          <p className="flex items-start gap-2">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("profile.privacyPoint1")}
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("profile.privacyPoint2")}
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("profile.privacyPoint3")}
          </p>
        </div>
      </SectionCard>

      {/* ── help & support ──────────────────────────────────────── */}
      <SectionCard title={t("profile.help")}>
        <form onSubmit={submitTicket} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="tk-subject">{t("profile.subject")}</Label>
              <Input
                id="tk-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                placeholder="e.g. Booking issue with a doctor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="BOOKING">Booking</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="ACCOUNT">Account</SelectItem>
                  <SelectItem value="REPORT">Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tk-message">{t("profile.message")}</Label>
            <Textarea
              id="tk-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder={t("profile.messagePlaceholder")}
            />
          </div>
          {ticketError ? (
            <p className="text-xs font-medium break-words text-destructive" role="alert">
              {ticketError}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={sendingTicket}>
              {sendingTicket ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {t("profile.contactSupport")}
            </Button>
          </div>
        </form>

        <Separator className="my-4" />

        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("profile.yourTickets")}
        </p>
        {tickets.loading && !tickets.data ? (
          <LoadingCard rows={2} />
        ) : tickets.error && !tickets.data ? (
          <ErrorState message={tickets.error} onRetry={tickets.reload} />
        ) : (tickets.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<HelpCircle className="h-6 w-6" />}
            title={t("profile.noTickets")}
            hint={t("profile.noTicketsHint")}
          />
        ) : (
          <ul className="app-scroll max-h-72 space-y-2.5 overflow-y-auto pr-1">
            {(tickets.data?.items ?? []).map((tk) => (
              <li
                key={tk.id}
                className="rounded-xl border border-border bg-background p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold text-foreground">
                    {tk.subject}
                  </p>
                  <TicketStatusBadge status={tk.status} />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {tk.category} · {fmtDateTime(tk.createdAt)}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground/80">
                  {tk.message}
                </p>
                {tk.reply ? (
                  <p className="mt-2 rounded-lg bg-primary-soft/50 px-2.5 py-1.5 text-xs leading-relaxed text-foreground/90">
                    <span className="font-semibold">{t("profile.help")}:</span>{" "}
                    {tk.reply}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── about the platform ─────────────────────────── */}
      <SectionCard title={t("profile.demoInfo")}>
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("profile.demoPoint1")}
          </p>
          <p className="flex items-start gap-2">
            <Globe
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t("profile.demoPoint2")}
          </p>
        </div>
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <PhoneCall className="h-3 w-3" aria-hidden="true" />
          {t("common.emergencyCall")}
        </p>
        <DemoNotice />
      </SectionCard>

      {/* ── danger zone ─────────────────────────────────────────── */}
      <SectionCard title={t("auth.signOut")} className="border-destructive/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("profile.signOutHint")}
          </p>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t("auth.signOut")}
          </Button>
        </div>
      </SectionCard>

      <p className="pb-2 text-center text-[11px] text-muted-foreground">
        <UserRound className="mr-1 inline h-3 w-3" aria-hidden="true" />
        {t("profile.footer")}
      </p>
    </div>
  );
}
