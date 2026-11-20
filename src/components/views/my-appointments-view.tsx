"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type FormEvent,
} from "react";
import {
  BadgeCheck,
  Ban,
  CalendarClock,
  CalendarOff,
  CheckCircle2,
  CircleAlert,
  Clock,
  Hourglass,
  LayoutDashboard,
  Loader2,
  LogIn,
  MapPin,
  Quote,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Star,
  Stethoscope,
  UserX,
  Video,
  Wallet,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import SlotPicker from "@/components/booking/slot-picker";
import { formatFee } from "@/components/doctors/doctor-card";
import { PatientTypeBadge } from "@/components/booking/patient-type-badge";
import { useAppStore } from "@/lib/store";
import { dhakaDateString, formatDhaka } from "@/lib/time";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentStatus } from "@/lib/constants";
import type {
  ApiResult,
  AppointmentDto,
  SlotInfoDto,
} from "@/lib/types";

/** Credentials from a successful guest lookup — reused for cancel/reschedule. */
type GuestCreds = { phone: string; code: string };

type StatusStyle = {
  label: string;
  variant: "default" | "secondary" | "outline";
  className?: string;
  icon: ElementType;
};

/** Badge presentation per appointment status (theme tokens only). */
const STATUS_STYLES: Record<AppointmentStatus, StatusStyle> = {
  PENDING_APPROVAL: {
    label: "Pending approval",
    variant: "outline",
    className: "border-warning/50 text-warning",
    icon: Hourglass,
  },
  CONFIRMED: {
    label: "Confirmed",
    variant: "default",
    className: "bg-success text-success-foreground hover:bg-success",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    className: "border-destructive/50 text-destructive",
    icon: XCircle,
  },
  CANCELLED_BY_PATIENT: { label: "Cancelled", variant: "secondary", icon: Ban },
  CANCELLED_BY_DOCTOR: { label: "Cancelled", variant: "secondary", icon: Ban },
  COMPLETED: {
    label: "Completed",
    variant: "outline",
    className: "border-primary/40 text-primary",
    icon: BadgeCheck,
  },
  EXPIRED: { label: "Expired", variant: "secondary", icon: Clock },
  NO_SHOW: {
    label: "No-show",
    variant: "outline",
    className: "border-destructive/40 text-destructive",
    icon: UserX,
  },
};

/** "MALE" -> "Male"; empty string for null/unknown. */
function genderLabel(gender: string | null): string {
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  if (gender === "OTHER") return "Other";
  return "";
}

function ListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="py-0">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-52" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MyAppointmentsView() {
  const { user, userLoaded, navigate, setAuthReturnView } = useAppStore();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- guest lookup ---
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCode, setGuestCode] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestSearched, setGuestSearched] = useState(false);
  const [guestCredentials, setGuestCredentials] = useState<GuestCreds | null>(
    null
  );

  // --- cancel dialog ---
  const [cancelTarget, setCancelTarget] = useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  // --- reschedule dialog ---
  const [rescheduleTarget, setRescheduleTarget] =
    useState<AppointmentDto | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<SlotInfoDto | null>(null);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [slotRefresh, setSlotRefresh] = useState(0);

  // --- review dialog (rate a completed visit) ---
  const [reviewTarget, setReviewTarget] = useState<AppointmentDto | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  // The list endpoint does not expose "already reviewed" — tracked locally
  // (also set when the server answers 409 ALREADY_REVIEWED).
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const isPatient = Boolean(userLoaded && user && user.role === "PATIENT");
  const isGuest = Boolean(userLoaded && !user);

  /**
   * Fetch appointments for the active mode. Without credentials this hits the
   * logged-in patient's list; with credentials it performs a guest lookup and
   * remembers the credentials for subsequent cancel/reschedule calls.
   */
  const loadAppointments = useCallback(
    async (creds?: GuestCreds): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const url = creds
          ? `/api/v1/appointments?phone=${encodeURIComponent(creds.phone)}&code=${encodeURIComponent(creds.code)}`
          : "/api/v1/appointments";
        const res = await fetch(url);
        const json = (await res.json()) as ApiResult<{
          items: AppointmentDto[];
        }>;
        if (!res.ok || !json.ok) {
          throw new Error(
            json.ok === false
              ? json.error.message
              : "Failed to load appointments."
          );
        }
        setAppointments(json.data.items);
        if (creds) setGuestCredentials(creds);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load appointments.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Could not load appointments",
          description: message,
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Logged-in patients load their full list on mount.
  useEffect(() => {
    if (isPatient) void loadAppointments();
  }, [isPatient, loadAppointments]);

  /** Refetch for the active mode (after an action or a retry click). */
  const refetch = useCallback(() => {
    if (user) {
      void loadAppointments();
      return;
    }
    if (guestCredentials) {
      void loadAppointments(guestCredentials);
      return;
    }
    const phone = guestPhone.trim();
    const code = guestCode.trim();
    if (phone && code) void loadAppointments({ phone, code });
  }, [user, guestCredentials, guestPhone, guestCode, loadAppointments]);

  const goToAuth = () => {
    setAuthReturnView({ name: "appointments" });
    navigate({ name: "auth" });
  };

  const openCancel = (appointment: AppointmentDto) => {
    setCancelReason("");
    setCancelTarget(appointment);
  };

  const openReschedule = (appointment: AppointmentDto) => {
    setRescheduleSlot(null);
    setRescheduleTarget(appointment);
  };

  const openReview = (appointment: AppointmentDto) => {
    setReviewRating(0);
    setReviewHover(0);
    setReviewComment("");
    setReviewTarget(appointment);
  };

  const submitReview = async () => {
    if (!reviewTarget || reviewBusy) return;
    const doctorSlug = reviewTarget.doctor?.slug;
    if (!doctorSlug) return;
    if (reviewRating < 1 || reviewRating > 5) {
      toast({
        variant: "destructive",
        title: "Pick a star rating",
        description: "Tap the stars to rate your visit.",
      });
      return;
    }
    setReviewBusy(true);
    try {
      const body: { rating: number; comment?: string } = { rating: reviewRating };
      const comment = reviewComment.trim();
      if (comment) body.comment = comment;
      const res = await fetch(
        `/api/v1/doctors/${encodeURIComponent(doctorSlug)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json().catch(() => null)) as ApiResult<{
        review: { id: string };
      }> | null;
      const errorCode = json && json.ok === false ? json.error.code : null;
      if (errorCode === "ALREADY_REVIEWED" || res.status === 409) {
        setReviewedIds((prev) => new Set(prev).add(reviewTarget.id));
        toast({
          title: "Already reviewed",
          description: "You have already rated this visit. Thank you!",
        });
        setReviewTarget(null);
        return;
      }
      if (!res.ok || !json || !json.ok) {
        toast({
          variant: "destructive",
          title: "Could not submit review",
          description:
            json && json.ok === false
              ? json.error.message
              : "Please try again.",
        });
        return;
      }
      setReviewedIds((prev) => new Set(prev).add(reviewTarget.id));
      toast({
        title: "Thanks for your feedback!",
        description: "Your rating helps other patients find great care.",
      });
      setReviewTarget(null);
      refetch();
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description:
          "Could not reach the server. Please check your connection and try again.",
      });
    } finally {
      setReviewBusy(false);
    }
  };

  const submitGuestLookup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guestBusy) return;
    const phone = guestPhone.trim();
    const code = guestCode.trim();
    if (!phone || !code) {
      toast({
        variant: "destructive",
        title: "Missing details",
        description:
          "Enter both the phone number you booked with and the reference code from your confirmation.",
      });
      return;
    }
    setGuestBusy(true);
    try {
      const found = await loadAppointments({ phone, code });
      if (found) setGuestSearched(true);
    } finally {
      setGuestBusy(false);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget || cancelBusy) return;
    setCancelBusy(true);
    try {
      const body: { reason?: string; phone?: string; referenceCode?: string } =
        {};
      const reason = cancelReason.trim();
      if (reason) body.reason = reason;
      if (!user && guestCredentials) {
        body.phone = guestCredentials.phone;
        body.referenceCode = guestCredentials.code;
      }
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(cancelTarget.id)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json()) as ApiResult<{
        appointment: AppointmentDto;
      }>;
      if (!res.ok || !json.ok) {
        toast({
          variant: "destructive",
          title: "Cancellation failed",
          description:
            json.ok === false ? json.error.message : "Please try again.",
        });
        return;
      }
      toast({
        title: "Appointment cancelled",
        description: `Your appointment with ${
          cancelTarget.doctor?.name ?? "the doctor"
        } on ${formatDhaka(new Date(cancelTarget.slotStart))} has been cancelled.`,
      });
      setCancelTarget(null);
      setCancelReason("");
      refetch();
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description:
          "Could not reach the server. Please check your connection and try again.",
      });
    } finally {
      setCancelBusy(false);
    }
  };

  const doReschedule = async () => {
    if (!rescheduleTarget || !rescheduleSlot || rescheduleBusy) return;
    setRescheduleBusy(true);
    try {
      const body: {
        newDate: string;
        newSlotStartIso: string;
        phone?: string;
        referenceCode?: string;
      } = {
        newDate: dhakaDateString(new Date(rescheduleSlot.startIso)),
        newSlotStartIso: rescheduleSlot.startIso,
      };
      if (!user && guestCredentials) {
        body.phone = guestCredentials.phone;
        body.referenceCode = guestCredentials.code;
      }
      const res = await fetch(
        `/api/v1/appointments/${encodeURIComponent(rescheduleTarget.id)}/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json()) as ApiResult<{
        appointment: AppointmentDto;
      }>;
      if (!res.ok || !json.ok) {
        const code = json.ok === false ? json.error.code : undefined;
        toast({
          variant: "destructive",
          title: "Reschedule failed",
          description:
            json.ok === false ? json.error.message : "Please try again.",
        });
        if (code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE") {
          // Availability changed under us — reset the pick and refresh the grid
          // so the user immediately sees the live slots (dialog stays open).
          setRescheduleSlot(null);
          setSlotRefresh((k) => k + 1);
        }
        return;
      }
      toast({
        title: "Appointment rescheduled",
        description:
          `Moved to ${formatDhaka(new Date(json.data.appointment.slotStart))}.` +
          (json.data.appointment.status === "PENDING_APPROVAL"
            ? " The doctor will approve the new time."
            : ""),
      });
      setRescheduleTarget(null);
      setRescheduleSlot(null);
      refetch();
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description:
          "Could not reach the server. Please check your connection and try again.",
      });
    } finally {
      setRescheduleBusy(false);
    }
  };

  const sortedAppointments = useMemo(
    () =>
      [...appointments]
        .sort(
          (a, b) =>
            new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime()
        )
        .slice(0, 100),
    [appointments]
  );

  // ---------------------------------------------------------------------
  // Branch 1: session not resolved yet — page skeleton.
  // ---------------------------------------------------------------------
  if (!userLoaded) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ListSkeleton />
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Branches 2 & 3: doctors and admins manage appointments elsewhere.
  // ---------------------------------------------------------------------
  if (user && user.role === "DOCTOR") {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <Card className="py-0">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Stethoscope className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold">
              You&apos;re signed in as a doctor
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Manage incoming requests and your schedule from the doctor
              dashboard.
            </p>
            <Button
              className="gap-1.5"
              onClick={() => navigate({ name: "doctor-dashboard" })}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Go to doctor dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && user.role === "ADMIN") {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <Card className="py-0">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold">
              You&apos;re signed in as an admin
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Review doctor verifications and platform activity from the admin
              console.
            </p>
            <Button className="gap-1.5" onClick={() => navigate({ name: "admin" })}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Go to admin console
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Branches 4 & 5: patient list / guest lookup + shared results area.
  // ---------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold sm:text-2xl">My appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track, cancel or reschedule your bookings. All times are Bangladesh
          time (GMT+6).
        </p>
      </header>

      {/* --- Guest mode: lookup card --- */}
      {isGuest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              Track without an account
            </CardTitle>
            <CardDescription>
              Enter the phone number and reference code from your booking
              confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={submitGuestLookup} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lookup-phone">Phone number</Label>
                  <Input
                    id="lookup-phone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lookup-code">Reference code</Label>
                  <Input
                    id="lookup-code"
                    value={guestCode}
                    onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
                    placeholder="MB-XXXXXX"
                    className="font-mono"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={20}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="gap-1.5" disabled={guestBusy}>
                {guestBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
                {guestBusy ? "Searching..." : "Find my appointments"}
              </Button>
            </form>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                Have an account? Sign in to see your full booking history.
              </p>
              <Button
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={goToAuth}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in for full history
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- Results area (shared by patient and guest modes) --- */}
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Could not load your appointments</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : sortedAppointments.length === 0 ? (
        isPatient ? (
          // Logged-in patient with no bookings yet.
          <Card className="py-0">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <CalendarOff
                className="h-10 w-10 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-semibold">No appointments yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Book your first appointment with a verified doctor.
              </p>
              <Button
                className="gap-1.5"
                onClick={() => navigate({ name: "search" })}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Find a doctor
              </Button>
            </CardContent>
          </Card>
        ) : guestSearched ? (
          // Guest lookup completed but matched nothing.
          <Card className="py-0">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <SearchX
                className="h-10 w-10 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="font-semibold">
                No appointments found for that phone number and reference code.
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Double-check the reference code from your booking confirmation
                (it looks like MB-XXXXXX) and the phone number you booked with.
              </p>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <section aria-label="Appointments list" className="space-y-3">
          {isGuest && guestCredentials && (
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Showing appointments booked with{" "}
              <span className="font-medium text-foreground">
                {guestCredentials.phone}
              </span>{" "}
              and reference code{" "}
              <span className="font-mono font-medium text-foreground">
                {guestCredentials.code}
              </span>
              .
            </p>
          )}
          <div className="medbriq-scroll max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {sortedAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={openCancel}
                onReschedule={openReschedule}
                canRate={
                  user !== null &&
                  appointment.status === "COMPLETED" &&
                  appointment.patientId === user.id &&
                  Boolean(appointment.doctor?.slug)
                }
                reviewed={reviewedIds.has(appointment.id)}
                onRate={openReview}
              />
            ))}
          </div>
        </section>
      )}

      {/* --- Cancel confirmation (destructive) --- */}
      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  {cancelTarget.doctor?.name ?? "Your appointment"} ·{" "}
                  {formatDhaka(new Date(cancelTarget.slotStart))}. The slot
                  will be released for other patients. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              maxLength={300}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Feeling better, schedule conflict..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBusy}>
              Keep appointment
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={cancelBusy}
              onClick={(e) => {
                // Keep the dialog open until the request settles; it is
                // closed programmatically on success (or stays open on error).
                e.preventDefault();
                void doCancel();
              }}
            >
              {cancelBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Reschedule dialog (non-destructive) --- */}
      <Dialog
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
      >
        <DialogContent className="medbriq-scroll max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              Reschedule appointment
            </DialogTitle>
            <DialogDescription>
              {rescheduleTarget && (
                <>
                  Pick a new slot with{" "}
                  {rescheduleTarget.doctor?.name ?? "the doctor"}. Current
                  slot: {formatDhaka(new Date(rescheduleTarget.slotStart))}
                  {rescheduleTarget.bookingMode === "APPROVAL"
                    ? " — the doctor will need to approve the new time"
                    : ""}
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {rescheduleTarget?.doctor?.slug ? (
            <SlotPicker
              doctorSlug={rescheduleTarget.doctor.slug}
              selectedSlot={rescheduleSlot}
              onSelectSlot={setRescheduleSlot}
              refreshKey={slotRefresh}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Doctor information is unavailable, so this appointment cannot be
              rescheduled here.
            </p>
          )}

          {rescheduleSlot && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="font-medium">
                {formatDhaka(new Date(rescheduleSlot.startIso))}
              </span>
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleTarget(null)}
              disabled={rescheduleBusy}
            >
              Close
            </Button>
            <Button
              onClick={() => void doReschedule()}
              disabled={!rescheduleSlot || rescheduleBusy}
              className="gap-1.5"
            >
              {rescheduleBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
              )}
              {rescheduleBusy ? "Rescheduling..." : "Confirm new slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Review dialog (rate a completed visit) --- */}
      <Dialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" aria-hidden="true" />
              Rate your visit
            </DialogTitle>
            <DialogDescription>
              {reviewTarget
                ? `How was your visit with ${
                    reviewTarget.doctor?.name ?? "the doctor"
                  } on ${formatDhaka(new Date(reviewTarget.slotStart))}?`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label="Star rating"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (reviewHover || reviewRating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={reviewRating === star}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="rounded p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          active
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comment">
                Comment{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="review-comment"
                rows={3}
                maxLength={1000}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share details of your visit — what went well, what could be better."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewTarget(null)}
              disabled={reviewBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void submitReview()}
              disabled={reviewBusy || reviewRating < 1}
              className="gap-1.5"
            >
              {reviewBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Star className="h-4 w-4" aria-hidden="true" />
              )}
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Shared appointment card used by both the patient list and the guest lookup
 * results. Shows status/type/reference, doctor + slot + patient details, fee,
 * the doctor's note (rejection/cancellation reason) and — when still
 * actionable — cancel/reschedule controls.
 */
function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  canRate,
  reviewed,
  onRate,
}: {
  appointment: AppointmentDto;
  onCancel: (appointment: AppointmentDto) => void;
  onReschedule: (appointment: AppointmentDto) => void;
  canRate: boolean;
  reviewed: boolean;
  onRate: (appointment: AppointmentDto) => void;
}) {
  const status = STATUS_STYLES[appointment.status];
  const active =
    appointment.status === "PENDING_APPROVAL" ||
    appointment.status === "CONFIRMED";
  const cancelable =
    active && new Date(appointment.slotStart).getTime() > Date.now();
  // Without a doctor slug there is no availability to pick from.
  const reschedulable = active && Boolean(appointment.doctor?.slug);
  const gender = genderLabel(appointment.patientGender);
  const doctorName = appointment.doctor?.name ?? "the doctor";

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-5">
        {/* Status / type / reference */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant} className={status.className}>
            <status.icon className="h-3 w-3" aria-hidden="true" />
            {status.label}
          </Badge>
          <Badge variant="outline">
            {appointment.type === "VIDEO" ? (
              <>
                <Video className="h-3 w-3" aria-hidden="true" />
                Video
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3" aria-hidden="true" />
                In-person
              </>
            )}
          </Badge>
          {appointment.patientType && (
            <PatientTypeBadge type={appointment.patientType} />
          )}
          <span
            className="ml-auto font-mono text-xs text-muted-foreground"
            aria-label={`Reference code ${appointment.referenceCode}`}
          >
            {appointment.referenceCode}
          </span>
        </div>

        {/* Body */}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-1.5">
            <p className="font-semibold leading-snug">
              {appointment.doctor?.name ?? "Doctor unavailable"}
            </p>
            {appointment.doctor && appointment.doctor.specialties.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {appointment.doctor.specialties.join(" · ")}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-sm">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="font-medium">
                {formatDhaka(new Date(appointment.slotStart))}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {appointment.patientName}
              {appointment.patientAge !== null &&
                ` · ${appointment.patientAge} yrs`}
              {gender && ` · ${gender}`}
            </p>
            {appointment.notes && (
              <blockquote className="mt-2 flex gap-2 border-l-2 pl-3 text-sm italic text-muted-foreground">
                <Quote
                  className="h-3.5 w-3.5 shrink-0 translate-y-0.5"
                  aria-hidden="true"
                />
                <span>{appointment.notes}</span>
              </blockquote>
            )}
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="text-base font-semibold">
              {formatFee(appointment.fee)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {appointment.bookingMode === "APPROVAL" ? (
                <>
                  <Hourglass className="h-3 w-3" aria-hidden="true" />
                  Needs doctor approval
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  Instant booking
                </>
              )}
            </span>
            {appointment.paymentStatus === "NOT_REQUIRED" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" aria-hidden="true" />
                Pay at chamber
              </span>
            )}
          </div>
        </div>

        {/* Doctor's note (rejection / cancellation reason) */}
        {appointment.doctorNote && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Doctor&apos;s note</AlertTitle>
            <AlertDescription>{appointment.doctorNote}</AlertDescription>
          </Alert>
        )}

        {/* Doctor's consultation note on completed visits */}
        {appointment.status === "COMPLETED" && appointment.consultationNote && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Stethoscope
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              Doctor&apos;s consultation note
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {appointment.consultationNote}
            </p>
          </div>
        )}

        {/* Actions */}
        {(cancelable || reschedulable || canRate) && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {cancelable && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onCancel(appointment)}
                aria-label={`Cancel appointment with ${doctorName}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
            )}
            {reschedulable && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onReschedule(appointment)}
                aria-label={`Reschedule appointment with ${doctorName}`}
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                Reschedule
              </Button>
            )}
            {canRate && !reviewed && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onRate(appointment)}
                aria-label={`Rate your visit with ${doctorName}`}
              >
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                Rate your visit
              </Button>
            )}
            {canRate && reviewed && (
              <Badge
                variant="outline"
                className="gap-1 border-success/40 text-success"
              >
                <Star className="h-3 w-3" aria-hidden="true" />
                Reviewed
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
