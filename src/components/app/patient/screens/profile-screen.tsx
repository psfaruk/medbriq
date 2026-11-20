"use client";

/**
 * ProfileScreen — account settings, language, notification preferences,
 * privacy, help & support tickets, demo info and sign-out.
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
  Globe,
  HelpCircle,
  Info,
  Languages,
  Loader2,
  LogOut,
  Mail,
  Phone,
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
import { useApiData } from "../parts";

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
        toast({ title: "No changes to save" });
        return;
      }
      const res = await apiPatch<{ user: typeof user }>("/api/v1/auth/me", body);
      setUser(res.user ?? null);
      toast({ title: "Profile updated" });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save.");
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setTicketError("Subject needs 3+ characters and message 10+ characters.");
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
      toast({ title: "Support ticket sent", description: "We usually reply within a day." });
      setSubject("");
      setMessage("");
      tickets.reload();
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : "Could not send the ticket.");
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
              <Badge variant="outline" className="mt-1.5 gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Phone verified
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── account ─────────────────────────────────────────────── */}
      <SectionCard title={t("profile.account")}>
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <p className="text-xs font-medium text-destructive" role="alert">
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

      {/* ── language ────────────────────────────────────────────── */}
      <SectionCard title={t("profile.language")}>
        <RadioGroup
          value={lang}
          onValueChange={(v) => setLang(v === "bn" ? "bn" : "en")}
          className="grid gap-2.5 sm:grid-cols-2"
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
                Appointment reminders
              </p>
              <p className="text-xs text-muted-foreground">
                In-app reminders for upcoming visits
              </p>
            </div>
            <Switch checked={reminders} onCheckedChange={setReminders} aria-label="Appointment reminders" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Email updates
              </p>
              <p className="text-xs text-muted-foreground">
                Booking receipts and platform news
              </p>
            </div>
            <Switch checked={emailUpdates} onCheckedChange={setEmailUpdates} aria-label="Email updates" />
          </div>
          <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Bell className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Channel preferences are saved on this device — synced notification
            settings are coming soon.
          </p>
        </div>
      </SectionCard>

      {/* ── privacy ─────────────────────────────────────────────── */}
      <SectionCard title={t("profile.privacy")}>
        <div className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Your health records are private. Only you and the doctors you visit
            can see your appointment history and notes.
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            We never sell your data. Phone numbers are used only for booking
            verification and appointment coordination.
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Payments run in a sandbox in this demo — no real money moves and no
            financial data is stored.
          </p>
        </div>
      </SectionCard>

      {/* ── help & support ──────────────────────────────────────── */}
      <SectionCard title={t("profile.help")}>
        <form onSubmit={submitTicket} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="tk-subject">Subject</Label>
              <Input
                id="tk-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                placeholder="e.g. Booking issue with a doctor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
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
            <Label htmlFor="tk-message">Message</Label>
            <Textarea
              id="tk-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Describe the issue (10+ characters)"
            />
          </div>
          {ticketError ? (
            <p className="text-xs font-medium text-destructive" role="alert">
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
          Your tickets
        </p>
        {tickets.loading && !tickets.data ? (
          <LoadingCard rows={2} />
        ) : tickets.error && !tickets.data ? (
          <ErrorState message={tickets.error} onRetry={tickets.reload} />
        ) : (tickets.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<HelpCircle className="h-6 w-6" />}
            title="No support tickets"
            hint="Messages you send to support appear here with their replies."
          />
        ) : (
          <ul className="max-h-72 space-y-2.5 overflow-y-auto app-scroll pr-1">
            {(tickets.data?.items ?? []).map((tk) => (
              <li key={tk.id} className="rounded-xl border border-border bg-background p-3.5">
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
                    <span className="font-semibold">Support:</span> {tk.reply}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── demo info ───────────────────────────────────────────── */}
      <SectionCard title="Demo information">
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            This is the MedBricBD demo environment. All doctors, hospitals,
            appointments and payments are fictional sandbox data.
          </p>
          <p className="flex items-start gap-2">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            Signed in as patient demo account. Telehealth (video consultations)
            is pending regulatory approval and disabled.
          </p>
        </div>
        <DemoNotice />
      </SectionCard>

      {/* ── danger zone ─────────────────────────────────────────── */}
      <SectionCard title="Sign out" className="border-destructive/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Ends your session on this device. Your bookings stay linked to your
            account.
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
        MedBricBD patient app · demo build
      </p>
    </div>
  );
}
