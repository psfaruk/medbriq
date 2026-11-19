"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { DAY_NAMES, formatDhaka, minutesToLabel } from "@/lib/time";
import { LANGUAGES } from "@/lib/constants";
import type {
  AppointmentDto,
  DoctorDashboardData,
  SessionUser,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Hourglass,
  Loader2,
  LockKeyhole,
  Phone,
  Plus,
  RotateCw,
  Star,
  Trash2,
  X,
} from "lucide-react";

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
    action: "approve" | "reject" | "complete",
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
              : "Appointment completed",
        description: `Reference ${appt.referenceCode}`,
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
                action === "complete"
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-success/50 text-success hover:bg-success/10 hover:text-success"
                          disabled={actionBusy !== null}
                          onClick={() => actOnAppointment(appt, "complete")}
                        >
                          {actionBusy === `${appt.id}:complete` ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <CheckCircle2 />
                          )}
                          Mark completed
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
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
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
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
