"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { DAY_NAMES, formatDhaka, minutesToLabel } from "@/lib/time";
import { LANGUAGES, RETURNING_VALIDITY_PRESETS_MONTHS } from "@/lib/constants";
import type {
  AppointmentDto,
  DoctorDashboardData,
  FeeHistoryItem,
  FeeSettingsDto,
  SessionUser,
  VisitHistoryItem,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  History,
  Hourglass,
  Loader2,
  LockKeyhole,
  Phone,
  Plus,
  RotateCw,
  Search,
  Star,
  Trash2,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import { formatFee } from "@/components/doctors/doctor-card";
import { PatientTypeBadge } from "@/components/booking/patient-type-badge";
import {
  paymentStatusLabel,
  validityLabel,
} from "@/lib/fee-labels";

/**
 * DoctorDashboardView — the doctor workspace: verification banner, stats,
 * booking requests, upcoming appointments, weekly availability editor and
 * profile settings.
 */

type DoctorProfileFields = {
  bio: string | null;
  experienceYears: number;
  consultationFee: number;
  followUpFee: number;
  videoConsultFee: number | null;
  chamberAddress: string | null;
  city: string;
  languages: string | null;
  supportsVideo: boolean;
  requiresApproval: boolean;
  regNumber: string | null;
  verificationStatus: string;
  verificationNote: string | null;
};

type DashboardData = DoctorDashboardData & { profile: DoctorProfileFields };

type LocalRule = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

const CITIES = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Barishal",
  "Rangpur",
  "Mymensingh",
];

const START_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30); // 0..1410
const END_OPTIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * 30); // 30..1440

/** 1440 means "end of day" (midnight), which minutesToLabel renders wrong. */
function timeOptionLabel(minutes: number): string {
  return minutes === 1440 ? "12:00 AM" : minutesToLabel(minutes);
}

function ruleRangeLabel(rule: LocalRule): string {
  return `${minutesToLabel(rule.startMinute)} – ${timeOptionLabel(rule.endMinute)}`;
}

function sortRules(rules: LocalRule[]): LocalRule[] {
  return [...rules].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute
  );
}

/** Client-side mirror of the server's availability validation. */
function validateRules(rules: LocalRule[]): string | null {
  if (rules.length > 40) return "At most 40 weekly rules are allowed.";
  for (const rule of rules) {
    if (rule.startMinute >= rule.endMinute) {
      return `${DAY_NAMES[rule.dayOfWeek]}: a range starts after it ends.`;
    }
  }
  for (let day = 0; day <= 6; day++) {
    const seen = new Set<number>();
    const active: LocalRule[] = [];
    for (const rule of rules) {
      if (rule.dayOfWeek !== day) continue;
      if (seen.has(rule.startMinute)) {
        return `${DAY_NAMES[day]}: two ranges share the same start time.`;
      }
      seen.add(rule.startMinute);
      if (rule.isActive) active.push(rule);
    }
    active.sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < active.length; i++) {
      if (active[i - 1].endMinute > active[i].startMinute) {
        return `${DAY_NAMES[day]}: active hours overlap.`;
      }
    }
  }
  return null;
}

/** fetch wrapper that never throws; returns normalized result. */
async function jsonFetch(
  url: string,
  init?: RequestInit
): Promise<
  { ok: true; data: unknown } | { ok: false; message: string; status: number }
> {
  try {
    const res = await fetch(url, init);
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && isApiSuccess(json)) return { ok: true, data: json.data };
    if (isApiError(json)) {
      return { ok: false, message: json.error.message, status: res.status };
    }
    return { ok: false, message: `Request failed (${res.status}).`, status: res.status };
  } catch {
    return { ok: false, message: "Network error. Check your connection.", status: 0 };
  }
}

function isApiSuccess(v: unknown): v is { ok: true; data: unknown } {
  return (
    typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true
  );
}

function isApiError(
  v: unknown
): v is { ok: false; error: { message: string; code: string } } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { ok?: unknown }).ok === false &&
    typeof (v as { error?: { message?: unknown } }).error?.message === "string"
  );
}

function genderLabel(gender: string | null): string | null {
  if (!gender) return null;
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Gate (auth + role) + inner dashboard
// ---------------------------------------------------------------------------

export default function DoctorDashboardView() {
  const { user, userLoaded, navigate, setAuthReturnView } = useAppStore();

  if (!userLoaded) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Sign in required</h2>
              <p className="text-sm text-muted-foreground">
                The doctor dashboard is only available to signed-in doctors.
              </p>
            </div>
            <Button
              onClick={() => {
                setAuthReturnView({ name: "doctor-dashboard" });
                navigate({ name: "auth" });
              }}
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "DOCTOR") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Doctor dashboard</h2>
              <p className="text-sm text-muted-foreground">
                This area is not available for your account.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate({ name: "home" })}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <DoctorDashboard user={user} />;
}

function DoctorDashboard({ user }: { user: SessionUser }) {
  const { toast } = useToast();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState("requests");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Availability editor state
  const [availRules, setAvailRules] = useState<LocalRule[]>([]);
  const [availSaving, setAvailSaving] = useState(false);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState("540");
  const [newEnd, setNewEnd] = useState("780");

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<AppointmentDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Complete dialog state (consultation note for the patient)
  const [completeTarget, setCompleteTarget] = useState<AppointmentDto | null>(
    null
  );
  const [completeNote, setCompleteNote] = useState("");

  // Profile form state
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [followUpFee, setFollowUpFee] = useState("");
  const [videoConsultFee, setVideoConsultFee] = useState("");
  const [city, setCity] = useState("");
  const [chamberAddress, setChamberAddress] = useState("");
  const [langCodes, setLangCodes] = useState<string[]>(["bn", "en"]);
  const [supportsVideo, setSupportsVideo] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Fee settings & patients (docs/FEE_SYSTEM.md §5-§6) ──
  const [feeSettings, setFeeSettings] = useState<FeeSettingsDto | null>(null);
  const [feeStatus, setFeeStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [feeError, setFeeError] = useState<string | null>(null);
  const [newPatientFee, setNewPatientFee] = useState("");
  const [returningPatientFee, setReturningPatientFee] = useState("");
  const [returningValidityValue, setReturningValidityValue] = useState("");
  const [returningValidityUnit, setReturningValidityUnit] = useState<
    "DAYS" | "MONTHS"
  >("MONTHS");
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpFeeValue, setFollowUpFeeValue] = useState("");
  const [followUpValidityValue, setFollowUpValidityValue] = useState("");
  const [followUpValidityUnit, setFollowUpValidityUnit] = useState<
    "DAYS" | "MONTHS"
  >("DAYS");
  const [changeReason, setChangeReason] = useState("");
  const [savingFees, setSavingFees] = useState(false);
  const [feeFormError, setFeeFormError] = useState<string | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [feesLoaded, setFeesLoaded] = useState(false);

  // Patient visit-history lookup (own visits only, by phone)
  const [visitPhone, setVisitPhone] = useState("");
  const [visitResult, setVisitResult] = useState<{
    patientName: string | null;
    phone: string;
    items: VisitHistoryItem[];
  } | null>(null);
  const [visitStatus, setVisitStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [visitError, setVisitError] = useState<string | null>(null);

  // No-show confirmation dialog
  const [noShowTarget, setNoShowTarget] = useState<AppointmentDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await jsonFetch("/api/v1/doctor/dashboard");
    if (result.ok) {
      setData(result.data as DashboardData);
      setLoadError(null);
    } else {
      setLoadError(result.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Load the doctor's own fee settings and mirror them into the form. */
  const loadFeeSettings = useCallback(async () => {
    setFeeStatus("loading");
    const result = await jsonFetch("/api/v1/doctor/fee-settings");
    if (result.ok) {
      const settings = (result.data as { settings: FeeSettingsDto }).settings;
      setFeeSettings(settings);
      setNewPatientFee(String(settings.newPatientFee));
      setReturningPatientFee(String(settings.returningPatientFee));
      setReturningValidityValue(String(settings.returningValidityValue));
      setReturningValidityUnit(settings.returningValidityUnit);
      setFollowUpEnabled(settings.followUpEnabled);
      setFollowUpFeeValue(String(settings.followUpFee));
      setFollowUpValidityValue(String(settings.followUpValidityValue));
      setFollowUpValidityUnit(settings.followUpValidityUnit);
      setFeeStatus("ready");
    } else {
      setFeeError(result.message);
      setFeeStatus("error");
    }
  }, []);

  const loadFeeHistory = useCallback(async () => {
    setHistoryLoading(true);
    const result = await jsonFetch(
      "/api/v1/doctor/fee-settings/history?limit=20"
    );
    setHistoryLoading(false);
    if (result.ok) {
      setFeeHistory((result.data as { items: FeeHistoryItem[] }).items);
    }
  }, []);

  // Fee data is fetched once, when the Fees & Patients tab is first opened.
  useEffect(() => {
    if (tab !== "fees" || feesLoaded) return;
    setFeesLoaded(true);
    void loadFeeSettings();
    void loadFeeHistory();
  }, [tab, feesLoaded, loadFeeSettings, loadFeeHistory]);

  // Mirror the server availability into local editor state on each load.
  const serverRules = useMemo<LocalRule[]>(
    () =>
      data
        ? sortRules(
            data.availability.map((r) => ({
              dayOfWeek: r.dayOfWeek,
              startMinute: r.startMinute,
              endMinute: r.endMinute,
              isActive: r.isActive,
            }))
          )
        : [],
    [data]
  );

  useEffect(() => {
    setAvailRules(serverRules.map((r) => ({ ...r })));
  }, [serverRules]);

  // Prefill the profile form from the dashboard payload.
  useEffect(() => {
    if (!data) return;
    const p = data.profile;
    setBio(p.bio ?? "");
    setExperienceYears(String(p.experienceYears));
    setConsultationFee(String(p.consultationFee));
    setFollowUpFee(String(p.followUpFee));
    setVideoConsultFee(p.videoConsultFee === null ? "" : String(p.videoConsultFee));
    setCity(p.city);
    setChamberAddress(p.chamberAddress ?? "");
    setLangCodes(
      p.languages
        ? p.languages.split(",").map((c) => c.trim()).filter(Boolean)
        : ["bn"]
    );
    setSupportsVideo(p.supportsVideo);
    setRequiresApproval(p.requiresApproval);
  }, [data]);

  const availDirty = useMemo(
    () =>
      JSON.stringify(sortRules(availRules)) !== JSON.stringify(serverRules),
    [availRules, serverRules]
  );
  const availError = useMemo(() => validateRules(availRules), [availRules]);

  // ------------------------- appointment actions -------------------------

  async function actOnAppointment(
    appt: AppointmentDto,
    action: "approve" | "reject" | "complete" | "no-show",
    body?: Record<string, unknown>
  ) {
    const busyKey = `${appt.id}:${action}`;
    setActionBusy(busyKey);
    const result = await jsonFetch(`/api/v1/appointments/${appt.id}/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setActionBusy(null);
    if (result.ok) {
      toast({
        title:
          action === "approve"
            ? "Request approved"
            : action === "reject"
              ? "Request rejected"
              : action === "no-show"
                ? "Marked as no-show"
                : "Appointment completed",
        description:
          action === "no-show"
            ? `Reference ${appt.referenceCode} — no visit recorded, so it does not count toward returning status.`
            : `Reference ${appt.referenceCode}`,
      });
      // Optimistic local removal, then refetch to sync stats and lists.
      setData((prev) =>
        prev
          ? {
              ...prev,
              pending:
                action === "approve" || action === "reject"
                  ? prev.pending.filter((a) => a.id !== appt.id)
                  : prev.pending,
              upcoming:
                action === "complete" || action === "no-show"
                  ? prev.upcoming.filter((a) => a.id !== appt.id)
                  : prev.upcoming,
            }
          : prev
      );
      await load();
    } else {
      toast({
        title: "Action failed",
        description: result.message,
        variant: "destructive",
      });
      await load();
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      toast({
        title: "Reason required",
        description: "Tell the patient why (at least 3 characters).",
        variant: "destructive",
      });
      return;
    }
    await actOnAppointment(rejectTarget, "reject", { reason });
    setRejectTarget(null);
    setRejectReason("");
  }

  async function confirmComplete() {
    if (!completeTarget) return;
    const note = completeNote.trim();
    await actOnAppointment(
      completeTarget,
      "complete",
      note ? { consultationNote: note } : undefined
    );
    setCompleteTarget(null);
    setCompleteNote("");
  }

  async function confirmNoShow() {
    if (!noShowTarget) return;
    const target = noShowTarget;
    setNoShowTarget(null);
    await actOnAppointment(target, "no-show");
  }

  // ---------------------------- fee settings -----------------------------

  async function saveFeeSettings(e: FormEvent) {
    e.preventDefault();
    setFeeFormError(null);
    const newFee = Number(newPatientFee);
    const retFee = Number(returningPatientFee);
    const retVal = Number(returningValidityValue);
    const fuFee = followUpFeeValue.trim() === "" ? 0 : Number(followUpFeeValue);
    const fuVal = followUpValidityValue.trim() === "" ? 0 : Number(followUpValidityValue);
    if (![newFee, retFee, retVal, fuFee, fuVal].every(Number.isFinite)) {
      setFeeFormError("All fee and validity fields must be numbers.");
      return;
    }
    setSavingFees(true);
    const result = await jsonFetch("/api/v1/doctor/fee-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPatientFee: newFee,
        returningPatientFee: retFee,
        returningValidityValue: retVal,
        returningValidityUnit: returningValidityUnit,
        followUpEnabled,
        followUpFee: fuFee,
        followUpValidityValue: fuVal,
        followUpValidityUnit: followUpValidityUnit,
        changeReason: changeReason.trim() === "" ? undefined : changeReason.trim(),
      }),
    });
    setSavingFees(false);
    if (result.ok) {
      const settings = (result.data as { settings: FeeSettingsDto }).settings;
      setFeeSettings(settings);
      setNewPatientFee(String(settings.newPatientFee));
      setReturningPatientFee(String(settings.returningPatientFee));
      setReturningValidityValue(String(settings.returningValidityValue));
      setReturningValidityUnit(settings.returningValidityUnit);
      setFollowUpEnabled(settings.followUpEnabled);
      setFollowUpFeeValue(String(settings.followUpFee));
      setFollowUpValidityValue(String(settings.followUpValidityValue));
      setFollowUpValidityUnit(settings.followUpValidityUnit);
      setChangeReason("");
      toast({
        title: "Fee settings saved",
        description: `Version ${settings.version} is live — new bookings are priced with it immediately.`,
      });
      void loadFeeHistory();
    } else {
      // Validation errors carry a human message from the API.
      setFeeFormError(result.message);
      toast({
        title: "Could not save fee settings",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  // -------------------------- visit history lookup ------------------------

  async function searchVisits(e: FormEvent) {
    e.preventDefault();
    const phone = visitPhone.trim();
    if (!phone) {
      toast({
        title: "Enter a phone number",
        description:
          "Type the patient's phone number to look up their visit history with you.",
        variant: "destructive",
      });
      return;
    }
    setVisitStatus("loading");
    setVisitError(null);
    const result = await jsonFetch(
      `/api/v1/doctor/patients/visits?phone=${encodeURIComponent(phone)}`
    );
    if (result.ok) {
      setVisitResult(
        result.data as {
          patientName: string | null;
          phone: string;
          items: VisitHistoryItem[];
        }
      );
      setVisitStatus("ready");
    } else {
      setVisitError(result.message);
      setVisitStatus("error");
    }
  }

  // --------------------------- availability ------------------------------

  function toggleDay(day: number, active: boolean) {
    setAvailRules((prev) =>
      prev.map((r) => (r.dayOfWeek === day ? { ...r, isActive: active } : r))
    );
  }

  function removeRule(day: number, startMinute: number) {
    setAvailRules((prev) =>
      prev.filter(
        (r) => !(r.dayOfWeek === day && r.startMinute === startMinute)
      )
    );
  }

  function startAdding(day: number) {
    setAddingDay(day);
    setNewStart("540");
    setNewEnd("780");
  }

  function confirmAdd() {
    if (addingDay === null) return;
    const start = Number(newStart);
    const end = Number(newEnd);
    if (!(start < end)) {
      toast({
        title: "Invalid range",
        description: "Start time must be before end time.",
        variant: "destructive",
      });
      return;
    }
    setAvailRules((prev) => [
      ...prev,
      { dayOfWeek: addingDay, startMinute: start, endMinute: end, isActive: true },
    ]);
    setAddingDay(null);
  }

  async function saveAvailability() {
    const error = validateRules(availRules);
    if (error) {
      toast({
        title: "Cannot save schedule",
        description: error,
        variant: "destructive",
      });
      return;
    }
    setAvailSaving(true);
    const result = await jsonFetch("/api/v1/doctor/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: availRules }),
    });
    setAvailSaving(false);
    if (result.ok) {
      const items = (result.data as { items: DashboardData["availability"] }).items;
      setData((prev) => (prev ? { ...prev, availability: items } : prev));
      toast({
        title: "Schedule saved",
        description: "Your weekly availability has been updated.",
      });
    } else {
      toast({
        title: "Could not save schedule",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  // ------------------------------ profile --------------------------------

  function toggleLanguage(code: string, checked: boolean) {
    setLangCodes((prev) =>
      checked
        ? prev.includes(code)
          ? prev
          : [...prev, code]
        : prev.filter((c) => c !== code)
    );
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    const years = Number(experienceYears);
    const fee = Number(consultationFee);
    const followUp = followUpFee.trim() === "" ? 0 : Number(followUpFee);
    const videoFee = videoConsultFee.trim() === "" ? null : Number(videoConsultFee);

    if (!Number.isInteger(years) || years < 0 || years > 60) {
      toast({ title: "Invalid experience", description: "Whole years, 0 to 60.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(fee) || fee <= 0) {
      toast({ title: "Invalid consultation fee", description: "Must be greater than zero.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(followUp) || followUp < 0) {
      toast({ title: "Invalid follow-up fee", variant: "destructive" });
      return;
    }
    if (videoFee !== null && (!Number.isFinite(videoFee) || videoFee <= 0)) {
      toast({ title: "Invalid video consultation fee", description: "Must be greater than zero, or leave empty.", variant: "destructive" });
      return;
    }
    if (langCodes.length === 0) {
      toast({ title: "Select at least one language", variant: "destructive" });
      return;
    }

    setSavingProfile(true);
    const result = await jsonFetch("/api/v1/doctor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio: bio.trim() === "" ? null : bio.trim(),
        experienceYears: years,
        consultationFee: fee,
        followUpFee: followUp,
        videoConsultFee: videoFee,
        city,
        chamberAddress: chamberAddress.trim() === "" ? null : chamberAddress.trim(),
        languages: langCodes.join(","),
        supportsVideo,
        requiresApproval,
      }),
    });
    setSavingProfile(false);
    if (result.ok) {
      const doctor = result.data as { doctor: DoctorProfileFields };
      setData((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, ...doctor.doctor },
            }
          : prev
      );
      toast({
        title: "Profile updated",
        description: "Your practice details are live.",
      });
    } else {
      toast({
        title: "Could not save profile",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  // ------------------------------- render --------------------------------

  const verificationStatus =
    data?.profile.verificationStatus ?? user.verificationStatus ?? "PENDING";

  const cityOptions = useMemo(() => {
    const set = new Set<string>(CITIES);
    if (data?.profile.city) set.add(data.profile.city);
    return Array.from(set);
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Doctor dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage bookings, availability and your practice profile.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={load}
          disabled={loading}
          aria-label="Refresh dashboard"
        >
          <RotateCw className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Verification banner */}
      {verificationStatus !== "VERIFIED" && (
        <div className="mt-6">
          {verificationStatus === "REJECTED" ? (
            <Alert variant="destructive">
              <X />
              <AlertTitle>Verification rejected</AlertTitle>
              <AlertDescription>
                {data?.profile.verificationNote ??
                  "Your verification was rejected. Update your profile and contact support."}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-warning/40 bg-warning/5">
              <Hourglass className="text-warning" />
              <AlertTitle>
                {verificationStatus === "MORE_INFO"
                  ? "Admin requested more information"
                  : "Awaiting verification"}
              </AlertTitle>
              <AlertDescription>
                {verificationStatus === "MORE_INFO"
                  ? data?.profile.verificationNote ??
                    "Please update your profile details so we can continue the review."
                  : "Your profile is awaiting admin verification — patients can't book you yet."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <Alert variant="destructive" className="mt-6">
          <X />
          <AlertTitle>Could not load your dashboard</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <span>{loadError}</span>
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {loading && !data ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Pending requests"
            value={String(data.stats.pendingRequests)}
            icon={<Hourglass className="h-4 w-4 text-warning" />}
          />
          <StatCard
            label="Today"
            value={String(data.stats.todayTotal)}
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Upcoming confirmed"
            value={String(data.stats.confirmedUpcoming)}
            icon={<CalendarCheck className="h-4 w-4 text-success" />}
          />
          <StatCard
            label="Completed total"
            value={String(data.stats.completedTotal)}
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Rating"
            value={
              data.stats.ratingAvg !== null
                ? `${data.stats.ratingAvg} (${data.stats.ratingCount})`
                : "—"
            }
            icon={<Star className="h-4 w-4 text-warning" />}
          />
          <StatCard
            label="Earnings (est. after 10% platform fee)"
            value={
              data.stats.earnings
                ? formatFee(data.stats.earnings.netEarnings)
                : "—"
            }
            sub={`from ${data.stats.completedTotal} completed visits`}
            icon={<Wallet className="h-4 w-4 text-success" />}
          />
        </div>
      ) : null}

      {/* Tabs */}
      {data && (
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="h-auto w-full flex-wrap sm:w-fit">
            <TabsTrigger value="requests" className="h-9 flex-1 sm:flex-none">
              Requests ({data.pending.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="h-9 flex-1 sm:flex-none">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="fees" className="h-9 flex-1 sm:flex-none">
              Fees &amp; Patients
            </TabsTrigger>
            <TabsTrigger value="availability" className="h-9 flex-1 sm:flex-none">
              Availability
            </TabsTrigger>
            <TabsTrigger value="profile" className="h-9 flex-1 sm:flex-none">
              Profile
            </TabsTrigger>
          </TabsList>

          {/* --------------------------- Requests --------------------------- */}
          <TabsContent value="requests" className="mt-4 space-y-3">
            {data.pending.length === 0 ? (
              <EmptyState
                title="No pending requests"
                description="New booking requests awaiting your approval will appear here."
              />
            ) : (
              data.pending.map((appt) => (
                <Card key={appt.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{appt.patientName}</p>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {appt.patientPhone}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <PatientTypeBadge type={appt.patientType} />
                        {appt.patientAge !== null && (
                          <Badge variant="secondary">{appt.patientAge} yrs</Badge>
                        )}
                        {genderLabel(appt.patientGender) && (
                          <Badge variant="secondary">
                            {genderLabel(appt.patientGender)}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {appt.type === "VIDEO" ? "Video" : "In person"}
                        </Badge>
                        <Badge variant="outline">৳ {appt.fee}</Badge>
                      </div>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Slot: </span>
                      <span className="font-medium">
                        {formatDhaka(new Date(appt.slotStart))}
                      </span>
                    </p>
                    {appt.notes && (
                      <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
                        “{appt.notes}”
                      </blockquote>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-success/50 text-success hover:bg-success/10 hover:text-success"
                        disabled={actionBusy !== null}
                        onClick={() => actOnAppointment(appt, "approve")}
                      >
                        {actionBusy === `${appt.id}:approve` ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Check />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={actionBusy !== null}
                        onClick={() => {
                          setRejectTarget(appt);
                          setRejectReason("");
                        }}
                      >
                        <X />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* --------------------------- Upcoming --------------------------- */}
          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {data.upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming appointments"
                description="Confirmed appointments will appear here."
              />
            ) : (
              data.upcoming.map((appt) => {
                const slotEnded =
                  new Date(appt.slotEnd).getTime() < Date.now();
                return (
                  <Card key={appt.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{appt.patientName}</p>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {appt.patientPhone}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <PatientTypeBadge type={appt.patientType} />
                          <Badge className="bg-success text-success-foreground hover:bg-success">
                            Confirmed
                          </Badge>
                          {appt.patientAge !== null && (
                            <Badge variant="secondary">{appt.patientAge} yrs</Badge>
                          )}
                          {genderLabel(appt.patientGender) && (
                            <Badge variant="secondary">
                              {genderLabel(appt.patientGender)}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {appt.type === "VIDEO" ? "Video" : "In person"}
                          </Badge>
                          <Badge variant="outline">৳ {appt.fee}</Badge>
                        </div>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Slot: </span>
                        <span className="font-medium">
                          {formatDhaka(new Date(appt.slotStart))}
                        </span>
                        {slotEnded && (
                          <span className="ml-2 text-xs text-warning">
                            Slot time has passed
                          </span>
                        )}
                      </p>
                      {appt.notes && (
                        <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
                          “{appt.notes}”
                        </blockquote>
                      )}
                      {slotEnded && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success/50 text-success hover:bg-success/10 hover:text-success"
                            disabled={actionBusy !== null}
                            onClick={() => {
                              setCompleteTarget(appt);
                              setCompleteNote("");
                            }}
                          >
                            {actionBusy === `${appt.id}:complete` ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <CheckCircle2 />
                            )}
                            Mark completed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                            disabled={actionBusy !== null}
                            onClick={() => setNoShowTarget(appt)}
                          >
                            {actionBusy === `${appt.id}:no-show` ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <UserX />
                            )}
                            Mark no-show
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ------------------------ Fees & Patients ------------------------ */}
          <TabsContent value="fees" className="mt-4 space-y-4">
            {/* 1. Fee settings form (docs/FEE_SYSTEM.md §1) */}
            {feeStatus === "loading" ? (
              <Card>
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-2/3" />
                </CardContent>
              </Card>
            ) : feeStatus === "error" ? (
              <Alert variant="destructive">
                <X />
                <AlertTitle>Could not load your fee settings</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>{feeError}</span>
                  <Button size="sm" variant="outline" onClick={() => void loadFeeSettings()}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <form onSubmit={saveFeeSettings} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                      <div>
                        <h3 className="font-semibold">Fee structure</h3>
                        <p className="text-xs text-muted-foreground">
                          New vs returning patient pricing for your chamber.
                          Fees are whole taka (৳), 0–100,000.
                        </p>
                      </div>
                      {feeSettings && (
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-primary"
                          aria-label={`Current fee settings version ${feeSettings.version}`}
                        >
                          v{feeSettings.version}
                        </Badge>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fee-new">New patient fee (৳)</Label>
                        <Input
                          id="fee-new"
                          type="number"
                          min={0}
                          max={100000}
                          step={1}
                          inputMode="numeric"
                          value={newPatientFee}
                          onChange={(e) => setNewPatientFee(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          First visit or after validity expires · নতুন রোগী
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fee-returning">Returning patient fee (৳)</Label>
                        <Input
                          id="fee-returning"
                          type="number"
                          min={0}
                          max={100000}
                          step={1}
                          inputMode="numeric"
                          value={returningPatientFee}
                          onChange={(e) => setReturningPatientFee(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Must not exceed the new-patient fee · পুরাতন রোগী
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fee-returning-value">Returning validity</Label>
                      <div className="flex max-w-sm gap-2">
                        <Input
                          id="fee-returning-value"
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={returningValidityValue}
                          onChange={(e) => setReturningValidityValue(e.target.value)}
                          className="w-24"
                          required
                        />
                        <Select
                          value={returningValidityUnit}
                          onValueChange={(v) =>
                            setReturningValidityUnit(v === "DAYS" ? "DAYS" : "MONTHS")
                          }
                        >
                          <SelectTrigger
                            id="fee-returning-unit"
                            className="w-32"
                            aria-label="Returning validity unit"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAYS">Days</SelectItem>
                            <SelectItem value="MONTHS">Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {returningValidityUnit === "MONTHS" && (
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Validity presets">
                          {RETURNING_VALIDITY_PRESETS_MONTHS.map((months) => (
                            <Button
                              key={months}
                              type="button"
                              size="sm"
                              variant={
                                returningValidityValue === String(months)
                                  ? "secondary"
                                  : "outline"
                              }
                              className="h-8"
                              onClick={() => setReturningValidityValue(String(months))}
                            >
                              {months} {months === 1 ? "month" : "months"}
                            </Button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        A completed visit keeps the returning fee for this long —
                        1–365 days or 1–36 months.
                      </p>
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Label
                            htmlFor="fee-followup-enabled"
                            className="cursor-pointer text-sm font-medium"
                          >
                            Offer a follow-up fee
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            A lower fee for a short window after a visit, before
                            the returning fee applies. Must not exceed the
                            new-patient fee.
                          </p>
                        </div>
                        <Switch
                          id="fee-followup-enabled"
                          checked={followUpEnabled}
                          onCheckedChange={setFollowUpEnabled}
                        />
                      </div>
                      {followUpEnabled && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="fee-followup">Follow-up fee (৳)</Label>
                            <Input
                              id="fee-followup"
                              type="number"
                              min={0}
                              max={100000}
                              step={1}
                              inputMode="numeric"
                              value={followUpFeeValue}
                              onChange={(e) => setFollowUpFeeValue(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fee-followup-value">Follow-up validity</Label>
                            <div className="flex gap-2">
                              <Input
                                id="fee-followup-value"
                                type="number"
                                min={1}
                                step={1}
                                inputMode="numeric"
                                value={followUpValidityValue}
                                onChange={(e) =>
                                  setFollowUpValidityValue(e.target.value)
                                }
                                className="w-20"
                                required
                              />
                              <Select
                                value={followUpValidityUnit}
                                onValueChange={(v) =>
                                  setFollowUpValidityUnit(v === "DAYS" ? "DAYS" : "MONTHS")
                                }
                              >
                                <SelectTrigger
                                  id="fee-followup-unit"
                                  className="flex-1"
                                  aria-label="Follow-up validity unit"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DAYS">Days</SelectItem>
                                  <SelectItem value="MONTHS">Months</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              1–90 days or 1–12 months.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fee-reason">Change reason (optional)</Label>
                      <Input
                        id="fee-reason"
                        maxLength={200}
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="e.g. Adjusting for chamber rent increase"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recorded in the immutable fee history for transparency.
                      </p>
                    </div>

                    {feeFormError && (
                      <p className="text-sm text-destructive" role="alert">
                        {feeFormError}
                      </p>
                    )}

                    <Button type="submit" disabled={savingFees}>
                      {savingFees && <Loader2 className="animate-spin" />}
                      Save fee settings
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* 2. Fee history + 3. patient visit lookup */}
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <History className="h-4 w-4 text-primary" aria-hidden="true" />
                    Fee history
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Review previous fee settings and changes — every version is
                    kept immutable.
                  </p>
                  {historyLoading ? (
                    <div className="mt-4 space-y-3" aria-busy="true">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                      ))}
                    </div>
                  ) : feeHistory.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No fee changes recorded yet.
                    </p>
                  ) : (
                    <ul className="medbriq-scroll mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                      {feeHistory.map((item) => (
                        <li key={item.id} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-primary"
                            >
                              v{item.version}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDhaka(new Date(item.createdAt))}
                            </span>
                          </div>
                          <p className="mt-2 text-sm">
                            New {formatFee(item.newPatientFee)} · Returning{" "}
                            {formatFee(item.returningPatientFee)} (valid{" "}
                            {validityLabel(
                              item.returningValidityValue,
                              item.returningValidityUnit
                            )}
                            )
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.followUpEnabled
                              ? `Follow-up ${formatFee(item.followUpFee)} (${validityLabel(
                                  item.followUpValidityValue,
                                  item.followUpValidityUnit
                                )})`
                              : "Follow-up disabled"}
                          </p>
                          {item.changeReason && (
                            <p className="mt-1 text-xs italic text-muted-foreground">
                              “{item.changeReason}”
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Search className="h-4 w-4 text-primary" aria-hidden="true" />
                    Patient visit history
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Look up a patient&apos;s completed visits with you by phone
                    number — see which ones count toward returning status.
                  </p>
                  <form
                    onSubmit={searchVisits}
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="visit-phone" className="sr-only">
                        Patient phone number
                      </Label>
                      <Input
                        id="visit-phone"
                        value={visitPhone}
                        onChange={(e) => setVisitPhone(e.target.value)}
                        placeholder="+880 1XXX-XXXXXX"
                        inputMode="tel"
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="gap-1.5"
                      disabled={visitStatus === "loading"}
                    >
                      {visitStatus === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </form>

                  {visitStatus === "error" && (
                    <p className="mt-3 text-sm text-destructive" role="alert">
                      {visitError}
                    </p>
                  )}

                  {visitStatus === "ready" && visitResult && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm">
                        <span className="font-medium">
                          {visitResult.patientName ?? "Unknown name"}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {visitResult.phone}
                        </span>
                      </p>
                      {visitResult.items.length === 0 ? (
                        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                          No completed visits with you for this phone number — a
                          booking now would be charged at the new-patient fee.
                        </p>
                      ) : (
                        <ul className="medbriq-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
                          {visitResult.items.map((visit) => (
                            <li key={visit.id} className="rounded-lg border p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium">
                                  {formatDhaka(new Date(visit.completedAt))}
                                </span>
                                {visit.qualifying ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  >
                                    Counts for returning status
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-border/60 text-muted-foreground"
                                  >
                                    Does not count (unpaid)
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {visit.patientName ?? "Unknown name"} · payment at
                                completion:{" "}
                                {paymentStatusLabel(visit.paymentStatusAtCompletion)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* -------------------------- Availability ------------------------- */}
          <TabsContent value="availability" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Times are Asia/Dhaka. Slot length is 30 minutes.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAvailRules(serverRules.map((r) => ({ ...r })))}
                  disabled={!availDirty || availSaving}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={saveAvailability}
                  disabled={!availDirty || availSaving || availError !== null}
                >
                  {availSaving && <Loader2 className="animate-spin" />}
                  Save schedule
                </Button>
              </div>
            </div>
            {availError && (
              <p className="text-sm text-destructive" role="alert">
                {availError}
              </p>
            )}
            {DAY_NAMES.map((day, dayIndex) => {
              const dayRules = availRules.filter(
                (r) => r.dayOfWeek === dayIndex
              );
              const dayActive = dayRules.some((r) => r.isActive);
              return (
                <Card key={day}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {dayRules.length === 0
                            ? "Closed"
                            : dayActive
                              ? "Active"
                              : "Paused"}
                        </span>
                        <Switch
                          checked={dayActive}
                          disabled={dayRules.length === 0}
                          onCheckedChange={(v) => toggleDay(dayIndex, v)}
                          aria-label={`Toggle ${day} availability`}
                        />
                      </div>
                    </div>
                    {dayRules.length === 0 && addingDay !== dayIndex && (
                      <p className="text-sm text-muted-foreground">
                        No hours set.
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {dayRules.map((rule) => (
                        <div
                          key={`${dayIndex}-${rule.startMinute}`}
                          className="flex items-center justify-between gap-2 rounded-md border bg-secondary/40 px-3 py-1.5 text-sm"
                        >
                          <span>{ruleRangeLabel(rule)}</span>
                          <span className="flex items-center gap-2">
                            {!rule.isActive && (
                              <Badge variant="outline">Paused</Badge>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                removeRule(dayIndex, rule.startMinute)
                              }
                              className="text-muted-foreground transition-colors hover:text-destructive"
                              aria-label={`Remove ${day} ${ruleRangeLabel(rule)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                    {addingDay === dayIndex ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={newStart}
                          onValueChange={setNewStart}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-32"
                            aria-label="Start time"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="medbriq-scroll">
                            {START_OPTIONS.map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {minutesToLabel(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">to</span>
                        <Select value={newEnd} onValueChange={setNewEnd}>
                          <SelectTrigger
                            size="sm"
                            className="w-32"
                            aria-label="End time"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="medbriq-scroll">
                            {END_OPTIONS.map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {timeOptionLabel(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={confirmAdd}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAddingDay(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startAdding(dayIndex)}
                      >
                        <Plus />
                        Add hours
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ---------------------------- Profile ---------------------------- */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 border-b pb-4">
                    <Badge
                      variant="outline"
                      className={
                        verificationStatus === "VERIFIED"
                          ? "border-success/50 text-success"
                          : verificationStatus === "REJECTED"
                            ? "border-destructive/50 text-destructive"
                            : "border-warning/50 text-warning"
                      }
                    >
                      {verificationStatus}
                    </Badge>
                    {data.profile.regNumber && (
                      <span className="text-xs text-muted-foreground">
                        BMDC Reg: {data.profile.regNumber}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-bio">Bio</Label>
                    <Textarea
                      id="doc-bio"
                      rows={4}
                      maxLength={2000}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell patients about your practice, qualifications and specialties..."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-experience">Experience (years)</Label>
                      <Input
                        id="doc-experience"
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-fee">Consultation fee (BDT)</Label>
                      <Input
                        id="doc-fee"
                        type="number"
                        min={1}
                        step="any"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-followup">Follow-up fee (BDT)</Label>
                      <Input
                        id="doc-followup"
                        type="number"
                        min={0}
                        step="any"
                        value={followUpFee}
                        onChange={(e) => setFollowUpFee(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-video-fee">
                        Video fee (BDT){" "}
                        <span className="text-muted-foreground">
                          (empty = off)
                        </span>
                      </Label>
                      <Input
                        id="doc-video-fee"
                        type="number"
                        min={1}
                        step="any"
                        value={videoConsultFee}
                        onChange={(e) => setVideoConsultFee(e.target.value)}
                        placeholder="Not offered"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="doc-city">City</Label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger id="doc-city" className="w-full">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cityOptions.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-chamber">Chamber address</Label>
                      <Input
                        id="doc-chamber"
                        maxLength={200}
                        value={chamberAddress}
                        onChange={(e) => setChamberAddress(e.target.value)}
                        placeholder="House 12, Road 5, Dhanmondi"
                      />
                    </div>
                  </div>

                  <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Booking prices come from your fee structure (Fees &amp;
                    Patients tab) — the new/returning patient fees there are the
                    authoritative source and are snapshotted on each booking.
                  </p>

                  <div className="space-y-2">
                    <Label>Languages</Label>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(LANGUAGES).map(([code, label]) => (
                        <label
                          key={code}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={langCodes.includes(code)}
                            onCheckedChange={(checked) =>
                              toggleLanguage(
                                code,
                                checked === true || checked === "indeterminate"
                              )
                            }
                            aria-label={label}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="doc-video"
                        className="cursor-pointer text-sm font-normal text-muted-foreground"
                      >
                        Offer video consultations
                      </Label>
                      <Switch
                        id="doc-video"
                        checked={supportsVideo}
                        onCheckedChange={setSupportsVideo}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="doc-approval"
                        className="cursor-pointer text-sm font-normal text-muted-foreground"
                      >
                        Require my approval for each booking
                      </Label>
                      <Switch
                        id="doc-approval"
                        checked={requiresApproval}
                        onCheckedChange={setRequiresApproval}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile && <Loader2 className="animate-spin" />}
                    Save profile
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject booking request</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${rejectTarget.patientName} · ${formatDhaka(new Date(rejectTarget.slotStart))}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Tell the patient why this request can't be accepted (required)."
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              disabled={actionBusy !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={
                rejectReason.trim().length < 3 || actionBusy !== null
              }
            >
              {actionBusy?.endsWith(":reject") && (
                <Loader2 className="animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog (optional consultation note) */}
      <Dialog
        open={completeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
            setCompleteNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2
                className="h-5 w-5 text-success"
                aria-hidden="true"
              />
              Mark visit completed
            </DialogTitle>
            <DialogDescription>
              {completeTarget
                ? `${completeTarget.patientName} · ${formatDhaka(
                    new Date(completeTarget.slotStart)
                  )}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="complete-note">
              Consultation note{" "}
              <span className="text-muted-foreground">
                (optional, visible to the patient)
              </span>
            </Label>
            <Textarea
              id="complete-note"
              rows={4}
              maxLength={2000}
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              placeholder="e.g. Diagnosis, advice given, follow-up date..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompleteTarget(null);
                setCompleteNote("");
              }}
              disabled={actionBusy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmComplete()}
              disabled={actionBusy !== null}
              className="gap-1.5"
            >
              {actionBusy?.endsWith(":complete") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Mark completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-show confirmation dialog (docs/FEE_SYSTEM.md §4 — records no visit) */}
      <AlertDialog
        open={noShowTarget !== null}
        onOpenChange={(open) => {
          if (!open) setNoShowTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this patient as no-show?</AlertDialogTitle>
            <AlertDialogDescription>
              {noShowTarget
                ? `${noShowTarget.patientName} · ${formatDhaka(
                    new Date(noShowTarget.slotStart)
                  )}. The appointment will be closed as NO_SHOW — it does not
                  count toward returning-patient status. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={actionBusy !== null}
              onClick={(e) => {
                e.preventDefault();
                void confirmNoShow();
              }}
            >
              {actionBusy?.endsWith(":no-show") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserX className="h-4 w-4" />
              )}
              Mark no-show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        {sub ? (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
        <CalendarCheck className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
