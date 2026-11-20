"use client";

import { useEffect, useState, type ElementType, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock,
  Hash,
  Hourglass,
  Info,
  Loader2,
  LogIn,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Video,
  Zap,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import SlotPicker from "@/components/booking/slot-picker";
import { useAppStore } from "@/lib/store";
import { dhakaDateString, formatDhaka } from "@/lib/time";
import type {
  ApiResult,
  AppointmentDto,
  DoctorDetail,
  SessionUser,
  SlotInfoDto,
} from "@/lib/types";

/** "৳1,000" — BDT symbol + grouped number (fees are whole taka in practice). */
function formatFee(fee: number): string {
  return `৳${Math.round(fee).toLocaleString("en-US")}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * The session user type has no phone field; if the auth payload carries one at
 * runtime, use it (minus any demo suffix) to prefill the booking form.
 */
function sessionPhone(user: SessionUser | null): string {
  if (!user) return "";
  const raw = (user as SessionUser & { phone?: unknown }).phone;
  if (typeof raw !== "string") return "";
  return raw.replace(/\s*\(demo\)\s*$/i, "").trim();
}

type Confirmation = {
  appointment: AppointmentDto;
  referenceCode: string;
};

export default function BookingView({ slug }: { slug: string }) {
  const { user, userLoaded, navigate, setAuthReturnView } = useAppStore();
  const { toast } = useToast();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [docStatus, setDocStatus] = useState<"loading" | "ready" | "error">("loading");
  const [docError, setDocError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<SlotInfoDto | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);

  const [type, setType] = useState<"IN_PERSON" | "VIDEO">("IN_PERSON");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // Load the doctor (agent 1-a endpoint). The envelope is normalized so the
  // view accepts both ok({ doctor }) and ok(<doctor>) shapes.
  useEffect(() => {
    let active = true;
    setDocStatus("loading");
    setDocError(null);
    fetch(`/api/v1/doctors/${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json: ApiResult<unknown>) => {
        if (!json.ok) {
          throw new Error(json.error?.message ?? "Doctor not found.");
        }
        if (!active) return;
        // Normalize the envelope: accept both ok({ doctor }) and ok(<doctor>).
        const data = json.data as { doctor?: DoctorDetail } | DoctorDetail;
        const loaded: DoctorDetail | undefined =
          data && typeof data === "object" && "doctor" in data
            ? data.doctor
            : (data as DoctorDetail);
        if (!loaded || typeof loaded.slug !== "string") {
          throw new Error("Doctor not found.");
        }
        setDoctor(loaded);
        setDocStatus("ready");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setDocError(err instanceof Error ? err.message : "Failed to load doctor.");
        setDocStatus("error");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  // Prefill patient details from the signed-in user (once, without wiping
  // anything the user already typed).
  useEffect(() => {
    if (!user) return;
    setPatientName((prev) => (prev ? prev : user.name));
    setPatientPhone((prev) => (prev ? prev : sessionPhone(user)));
  }, [user]);

  const bookingDate = selectedSlot
    ? dhakaDateString(new Date(selectedSlot.startIso))
    : null;

  const videoFee = doctor
    ? doctor.videoConsultFee ?? doctor.consultationFee
    : 0;
  const effectiveFee =
    type === "VIDEO" && doctor?.supportsVideo ? videoFee : doctor?.consultationFee ?? 0;

  const goToAuth = () => {
    setAuthReturnView({ name: "booking", slug });
    navigate({ name: "auth" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!doctor || !selectedSlot || !bookingDate || submitting) return;

    if (patientName.trim().length < 2) {
      toast({
        variant: "destructive",
        title: "Missing patient name",
        description: "Please enter the patient's full name (at least 2 characters).",
      });
      return;
    }
    if (!/^\+?[0-9\-() ]{8,20}$/.test(patientPhone.trim())) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description:
          "Enter a valid phone number (8-20 digits; may include +, spaces, dashes and parentheses).",
      });
      return;
    }
    const age = patientAge.trim();
    if (age !== "" && (!/^\d+$/.test(age) || Number(age) > 120)) {
      toast({
        variant: "destructive",
        title: "Invalid age",
        description: "Age must be a whole number between 0 and 120.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorSlug: doctor.slug,
          date: bookingDate,
          slotStartIso: selectedSlot.startIso,
          type,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          patientAge: age === "" ? undefined : Number(age),
          patientGender: patientGender || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json()) as ApiResult<{
        appointment: AppointmentDto;
        referenceCode: string;
      }>;

      if (!res.ok || !json.ok) {
        const message =
          json && json.ok === false
            ? json.error.message
            : "Booking failed. Please try again.";
        const code = json && json.ok === false ? json.error.code : undefined;
        if (code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE") {
          toast({
            variant: "destructive",
            title: "Slot no longer available",
            description: message,
          });
          setSelectedSlot(null);
          setSlotRefresh((k) => k + 1); // refetch fresh availability
          return;
        }
        toast({
          variant: "destructive",
          title: "Booking failed",
          description: message,
        });
        return;
      }

      setConfirmation({
        appointment: json.data.appointment,
        referenceCode: json.data.referenceCode,
      });
      setSelectedSlot(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Could not reach the server. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground"
          onClick={() => navigate({ name: "doctor", slug })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Button>
      </div>

      {docStatus === "loading" ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[52px] w-16" />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : docStatus === "error" ? (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Could not load this doctor</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{docError ?? "The doctor may have been removed."}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ name: "search" })}
            >
              Back to search
            </Button>
          </AlertDescription>
        </Alert>
      ) : doctor ? (
        <>
          {/* Doctor header */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  {doctor.photoUrl ? (
                    <AvatarImage src={doctor.photoUrl} alt={doctor.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {initials(doctor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold sm:text-xl">
                      {doctor.name}
                    </h1>
                    {doctor.verificationStatus === "VERIFIED" ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                        <ShieldCheck className="h-4 w-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-warning">
                        <Clock className="h-4 w-4" />
                        Pending verification
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {doctor.specialties.slice(0, 4).map((s) => (
                      <Badge key={s.slug} variant="secondary" className="text-xs">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {doctor.city}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatFee(doctor.consultationFee)}
                    </span>
                    {doctor.supportsVideo && (
                      <span className="inline-flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" />
                        Video consult available
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {doctor.requiresApproval ? (
                      <>
                        <Hourglass className="h-3.5 w-3.5" />
                        Bookings require doctor approval
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" />
                        Instant confirmation
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {doctor.verificationStatus !== "VERIFIED" ? (
            <Alert className="border-warning/40 bg-warning/10">
              <Clock className="h-4 w-4 text-warning" />
              <AlertTitle>
                This doctor is pending admin verification — booking is not available yet.
              </AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span>
                  Please check back soon. The profile becomes bookable once
                  Medbriq verifies the doctor&apos;s credentials.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ name: "search" })}
                >
                  Back to search
                </Button>
              </AlertDescription>
            </Alert>
          ) : confirmation ? (
            /* Confirmation screen */
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center gap-3 text-center">
                  <CheckCircle2
                    className="h-16 w-16 text-success"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                    Appointment {confirmation.referenceCode}
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {confirmation.appointment.status === "CONFIRMED"
                      ? "Your appointment is confirmed. Arrive 10 minutes early."
                      : "Request sent. The doctor will approve it shortly — track it under My Appointments."}
                  </p>
                  {!user && (
                    <p className="max-w-md text-xs text-muted-foreground">
                      Save this reference code — you can track this appointment
                      anytime with your phone number and this code.
                    </p>
                  )}
                </div>

                <div className="mt-6 divide-y rounded-lg border">
                  <DetailRow
                    icon={Stethoscope}
                    label="Doctor"
                    value={confirmation.appointment.doctor?.name ?? "—"}
                  />
                  <DetailRow
                    icon={CalendarClock}
                    label="Date &amp; time"
                    value={formatDhaka(new Date(confirmation.appointment.slotStart))}
                  />
                  <DetailRow
                    icon={confirmation.appointment.type === "VIDEO" ? Video : MapPin}
                    label="Type"
                    value={
                      confirmation.appointment.type === "VIDEO"
                        ? "Video consultation"
                        : "In-person visit"
                    }
                  />
                  <DetailRow
                    icon={Hash}
                    label="Consultation fee"
                    value={formatFee(confirmation.appointment.fee)}
                  />
                </div>

                <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button
                    onClick={() => navigate({ name: "appointments" })}
                    className="gap-1.5"
                  >
                    <CalendarCheck className="h-4 w-4" />
                    View My Appointments
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate({ name: "home" })}
                  >
                    Back to home
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid items-start gap-6 lg:grid-cols-3">
                {/* Slot selection */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      Select date &amp; time
                    </CardTitle>
                    <CardDescription>
                      All times are Bangladesh time (GMT+6). Each slot is 30 minutes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SlotPicker
                      doctorSlug={doctor.slug}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                      refreshKey={slotRefresh}
                    />
                  </CardContent>
                </Card>

                {/* Booking form */}
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-base">Booking details</CardTitle>
                    <CardDescription>
                      {user
                        ? `Booking as ${user.name} (signed in)`
                        : "Booking as guest"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                      <fieldset
                        disabled={!selectedSlot || submitting}
                        className={cn("space-y-4", !selectedSlot && "opacity-60")}
                      >
                        <div className="space-y-2">
                          <Label>Appointment type</Label>
                          <RadioGroup
                            value={type}
                            onValueChange={(v) =>
                              setType(v === "VIDEO" ? "VIDEO" : "IN_PERSON")
                            }
                            className="gap-2"
                          >
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                                type === "IN_PERSON"
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <RadioGroupItem value="IN_PERSON" />
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 text-sm font-medium">
                                In-person visit
                              </span>
                              <span className="text-sm font-semibold">
                                {formatFee(doctor.consultationFee)}
                              </span>
                            </label>
                            {doctor.supportsVideo && (
                              <label
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                                  type === "VIDEO"
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted/50"
                                )}
                              >
                                <RadioGroupItem value="VIDEO" />
                                <Video className="h-4 w-4 text-muted-foreground" />
                                <span className="flex-1 text-sm font-medium">
                                  Video consultation
                                </span>
                                <span className="text-sm font-semibold">
                                  {formatFee(videoFee)}
                                </span>
                              </label>
                            )}
                          </RadioGroup>
                        </div>

                        {selectedSlot && (
                          <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
                            <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-medium">
                              {formatDhaka(new Date(selectedSlot.startIso))}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {formatFee(effectiveFee)}
                            </span>
                          </p>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="booking-name">Patient name</Label>
                          <Input
                            id="booking-name"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Full name"
                            autoComplete="name"
                            maxLength={80}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="booking-phone">Phone number</Label>
                          <Input
                            id="booking-phone"
                            value={patientPhone}
                            onChange={(e) => setPatientPhone(e.target.value)}
                            placeholder="+880 1XXX-XXXXXX"
                            inputMode="tel"
                            autoComplete="tel"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="booking-age">Age (optional)</Label>
                            <Input
                              id="booking-age"
                              value={patientAge}
                              onChange={(e) =>
                                setPatientAge(e.target.value.replace(/[^\d]/g, ""))
                              }
                              placeholder="e.g. 32"
                              inputMode="numeric"
                              maxLength={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="booking-gender">Gender (optional)</Label>
                            <Select
                              value={patientGender}
                              onValueChange={setPatientGender}
                            >
                              <SelectTrigger id="booking-gender" className="w-full">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="booking-notes">
                            Note for the doctor (optional)
                          </Label>
                          <Textarea
                            id="booking-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                            placeholder="Symptoms, previous reports, anything the doctor should know..."
                            rows={3}
                          />
                          <p className="text-right text-xs text-muted-foreground">
                            {notes.length}/500
                          </p>
                        </div>
                      </fieldset>

                      {!selectedSlot && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarClock className="h-4 w-4" />
                          Pick a date and time slot to continue.
                        </p>
                      )}

                      <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={!selectedSlot || submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          <>Confirm booking · {formatFee(effectiveFee)}</>
                        )}
                      </Button>
                    </form>

                    {!user && userLoaded && (
                      <Alert className="mt-4 border-primary/30 bg-primary/5">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Booking as guest</AlertTitle>
                        <AlertDescription className="flex flex-col items-start gap-2">
                          <p>
                            Track your appointment with your phone number and the
                            reference code you&apos;ll receive. You can also sign in.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={goToAuth}
                          >
                            <LogIn className="h-3.5 w-3.5" />
                            Sign in
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
