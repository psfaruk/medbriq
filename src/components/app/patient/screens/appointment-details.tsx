"use client";

/**
 * appointment-details.tsx — full appointment view (new style) with
 * reschedule, cancel, sandbox pay-now and post-visit review actions.
 */

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CalendarClock,
  CalendarPlus,
  Copy,
  Loader2,
  MapPin,
  NotebookPen,
  Stethoscope,
  UserRound,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/app-state";
import { ApiCallError, apiGet, apiPost } from "@/lib/api-client";
import type { AppointmentDto, SlotInfoDto } from "@/lib/types";
import {
  AppointmentStatusBadge,
  DemoNotice,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PaymentStatusBadge,
  PatientTypeBadge,
  SectionCard,
  useT,
  fmtDateLong,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import { DateStrip, InfoRow, SlotGrid, genderLabel } from "./shared";
import VvsPatientCard from "@/components/vvs/patient-card";

type PayMethod = "BKASH" | "NAGAD" | "CARD";

// ── reschedule dialog ───────────────────────────────────────────────

function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: {
  appointment: AppointmentDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [date, setDate] = useState(() => appointment.slotStart.slice(0, 10));
  const [slots, setSlots] = useState<SlotInfoDto[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slot, setSlot] = useState<SlotInfoDto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    apiGet<{ slots: SlotInfoDto[] }>(
      `/api/v1/doctors/${appointment.doctor?.slug}/slots?date=${date}`
    )
      .then((d) => {
        if (active) setSlots(d.slots);
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, date, appointment.doctor?.slug]);

  const changeDate = (d: string) => {
    setDate(d);
    setSlot(null);
    setSlotsLoading(true);
  };

  const submit = async () => {
    if (!slot) return;
    setSaving(true);
    try {
      await apiPost(`/api/v1/appointments/${appointment.id}/reschedule`, {
        newDate: date,
        newSlotStartIso: slot.startIso,
      });
      toast({
        title: t("appointments.rescheduled"),
        description: `${fmtDateLong(slot.startIso)} · ${fmtTime(slot.startIso)}`,
      });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({
        title: t("appointments.rescheduleFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const bookable = (slots ?? []).filter((s) => !s.taken && !s.past);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-scroll max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("appointments.reschedule")}</DialogTitle>
          <DialogDescription>
            {t("appointments.rescheduleHint")}{" "}
            {appointment.bookingMode === "APPROVAL"
              ? t("appointments.rescheduleApprovalHint")
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DateStrip value={date} onChange={changeDate} />
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : bookable.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
              {t("booking.noSlots")}
            </p>
          ) : (
            <SlotGrid
              slots={slots ?? []}
              selectedIso={slot?.startIso ?? null}
              onSelect={setSlot}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={!slot || saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("appointments.reschedule")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── cancel dialog ───────────────────────────────────────────────────

function CancelDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: {
  appointment: AppointmentDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiPost(`/api/v1/appointments/${appointment.id}/cancel`, {
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast({ title: t("appointments.cancelled") });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({
        title: t("appointments.cancelFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("appointments.confirmCancel")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("appointments.confirmCancelHint")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-1">
          <Label htmlFor="cancel-reason">
            {t("appointments.cancelReason")}
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="e.g. schedule conflict"
            className="mt-1.5"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the POST settles
              submit();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {t("appointments.cancelBooking")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── sandbox pay dialog ──────────────────────────────────────────────

function PayDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: {
  appointment: AppointmentDto;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [method, setMethod] = useState<PayMethod>("BKASH");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiPost("/api/v2/payments", {
        appointmentId: appointment.id,
        method,
      });
      toast({ title: t("booking.paymentSuccess") });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({
        title: t("appointments.payFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("booking.payOnline")}</DialogTitle>
          <DialogDescription>
            <Money amount={appointment.fee} currency={appointment.currency} /> ·{" "}
            {appointment.referenceCode}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {(["BKASH", "NAGAD", "CARD"] as PayMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                method === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              )}
            >
              {m === "BKASH" ? "bKash" : m === "NAGAD" ? "Nagad" : "Card"}
            </button>
          ))}
        </div>
        <DemoNotice>
          <strong className="text-foreground">
            {t("booking.sandboxTitle")}
          </strong>{" "}
          {t("booking.sandboxPayments")}
        </DemoNotice>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {t("common.pay")}{" "}
            <Money amount={appointment.fee} currency={appointment.currency} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── review dialog ───────────────────────────────────────────────────

function ReviewDialog({
  doctorSlug,
  doctorName,
  open,
  onOpenChange,
  onDone,
}: {
  doctorSlug: string;
  doctorName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError(t("appointments.selectRating"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/v1/doctors/${doctorSlug}/reviews`, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast({
        title: t("appointments.reviewSubmitted"),
        description: t("appointments.reviewThanks", { name: doctorName }),
      });
      onOpenChange(false);
      onDone();
    } catch (err) {
      if (err instanceof ApiCallError && err.code === "ALREADY_REVIEWED") {
        toast({ title: t("appointments.alreadyReviewed") });
        onOpenChange(false);
        onDone();
        return;
      }
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("appointments.rateTitle", { name: doctorName })}</DialogTitle>
          <DialogDescription>{t("appointments.rateSubtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="flex justify-center gap-1.5"
            role="radiogroup"
            aria-label={t("appointments.rateTitle", { name: doctorName })}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors",
                  rating >= n
                    ? "border-amber-300 bg-amber-50 text-amber-500"
                    : "border-border bg-background text-muted-foreground hover:border-amber-300"
                )}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-5 w-5"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                </svg>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">
              {t("appointments.comment")} ({t("common.optional")})
            </Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder={t("appointments.commentPlaceholder")}
            />
          </div>
          {error ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("appointments.submitReview")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── main screen ─────────────────────────────────────────────────────

export default function AppointmentDetailsScreen({ id }: { id: string }) {
  const { t } = useT();
  const { toast } = useToast();
  const popPatient = useAppStore((s) => s.popPatient);
  const [items, setItems] = useState<AppointmentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<{ items: AppointmentDto[] }>("/api/v1/appointments")
      .then((d) => {
        if (!active) return;
        setItems(d.items);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (loading && !items) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={6} />
      </div>
    );
  }

  if (error && !items) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const appointment = items?.find((a) => a.id === id) ?? null;

  if (!appointment) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("appointments.details")}
          onBack={popPatient}
        />
        <ErrorState message={t("appointments.notFound")} onRetry={reload} />
      </div>
    );
  }

  const a = appointment;
  const isActive =
    a.status === "PENDING_APPROVAL" || a.status === "CONFIRMED";
  const slotInFuture = new Date(a.slotEnd).getTime() > Date.now();
  const canManage = isActive && slotInFuture;
  const canPay =
    canManage &&
    a.paymentStatus !== "PAID" &&
    a.paymentStatus !== "REFUNDED";
  const canReview =
    a.status === "COMPLETED" && !reviewed && Boolean(a.doctor?.slug);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(a.referenceCode);
      toast({ title: t("booking.copied"), description: a.referenceCode });
    } catch {
      toast({
        title: t("booking.copyFailed"),
        description: a.referenceCode,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("appointments.details")} onBack={popPatient} />

      {/* ── status + reference ──────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <AppointmentStatusBadge status={a.status} />
          <PaymentStatusBadge status={a.paymentStatus} />
          {a.patientType ? <PatientTypeBadge type={a.patientType} /> : null}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 bg-muted/60 px-3 py-1.5 font-mono text-sm"
          >
            {t("booking.reference")}: {a.referenceCode}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={copyRef}
            aria-label={t("booking.copyReference")}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* ── visit card ──────────────────────────────────────────── */}
      <SectionCard title={t("appointments.visit")}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {a.doctor?.name ?? t("common.doctor")}
            </p>
            <p className="text-xs text-muted-foreground">
              {a.doctor?.specialties?.join(", ")}
            </p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-border/70">
          <InfoRow label={t("common.date")}>{fmtDateLong(a.slotStart)}</InfoRow>
          <InfoRow label={t("common.time")}>
            {fmtTime(a.slotStart)} – {fmtTime(a.slotEnd)}
          </InfoRow>
          {a.chamberName ? (
            <InfoRow label={t("booking.selectChamber")}>
              <span className="inline-flex items-center gap-1">
                <MapPin
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                {a.chamberName}
              </span>
            </InfoRow>
          ) : null}
          {a.type === "VIDEO" ? (
            <InfoRow label={t("common.type")}>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Video className="h-3 w-3" aria-hidden="true" />
                {t("appointments.videoConsult")}
              </Badge>
            </InfoRow>
          ) : null}
        </div>
      </SectionCard>

      {/* ── video waiting-room placeholder ──────────────────────── */}
      {a.type === "VIDEO" ? (
        <SectionCard title={t("appointments.videoReady")}>
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
            <Video
              className="mx-auto h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {t("appointments.videoDisabled")}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              {t("appointments.videoDisabledHint")}
            </p>
          </div>
        </SectionCard>
      ) : null}

      {/* ── patient info ────────────────────────────────────────── */}
      <SectionCard title={t("booking.patientDetails")}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-foreground">{a.patientName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {a.patientPhone}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[
                a.patientAge != null
                  ? t("common.ageYears", { years: a.patientAge })
                  : null,
                a.patientGender ? genderLabel(a.patientGender) : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── fee breakdown ───────────────────────────────────────── */}
      <SectionCard title={t("booking.feeBreakdown")}>
        <div className="divide-y divide-border/70">
          <InfoRow label={t("booking.patientType")}>
            {a.patientType ? <PatientTypeBadge type={a.patientType} /> : "—"}
          </InfoRow>
          <InfoRow label={t("booking.consultationFee")}>
            <Money amount={a.fee} currency={a.currency} />
          </InfoRow>
          <InfoRow label={t("common.payment")}>
            <PaymentStatusBadge status={a.paymentStatus} />
          </InfoRow>
          <InfoRow label={t("common.total")} strong>
            <Money amount={a.fee} currency={a.currency} />
          </InfoRow>
        </div>
      </SectionCard>

      {/* ── Verified Visit System (form + visit record) ─────── */}
      <VvsPatientCard appointment={a} onChanged={reload} />

      {/* ── notes ───────────────────────────────────────────────── */}
      {a.notes ? (
        <SectionCard title={t("appointments.notes")}>
          <p className="text-sm leading-relaxed text-foreground/90">{a.notes}</p>
        </SectionCard>
      ) : null}

      {a.status === "COMPLETED" && a.consultationNote ? (
        <SectionCard title={t("appointments.consultationNote")}>
          <p className="text-sm leading-relaxed text-foreground/90">
            {a.consultationNote}
          </p>
        </SectionCard>
      ) : null}

      {/* ── review ──────────────────────────────────────────────── */}
      {canReview ? (
        <SectionCard title={t("appointments.rateVisit")}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("appointments.rateHint", { name: a.doctor?.name ?? "" })}
            </p>
            <Button variant="outline" onClick={() => setReviewOpen(true)}>
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
              {t("appointments.writeReview")}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {/* ── actions ─────────────────────────────────────────────── */}
      {canManage ? (
        <SectionCard title={t("appointments.actions")}>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {t("appointments.reschedule")}
            </Button>
            {canPay ? (
              <Button onClick={() => setPayOpen(true)}>
                {t("common.payNow")}
              </Button>
            ) : (
              <Button variant="outline" disabled className="opacity-60">
                {a.paymentStatus === "PAID"
                  ? t("pay.PAID")
                  : t("pay.NOT_REQUIRED")}
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              {t("appointments.cancelBooking")}
            </Button>
          </div>
          <DemoNotice />
        </SectionCard>
      ) : null}

      {/* ── empty actions hint for past visits ──────────────────── */}
      {!canManage && a.status === "COMPLETED" ? (
        <div className="flex justify-center pb-2">
          <Button variant="ghost" size="sm" onClick={reload}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : null}

      <RescheduleDialog
        appointment={a}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        onDone={reload}
      />
      <CancelDialog
        appointment={a}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onDone={reload}
      />
      <PayDialog
        appointment={a}
        open={payOpen}
        onOpenChange={setPayOpen}
        onDone={reload}
      />
      {a.doctor ? (
        <ReviewDialog
          doctorSlug={a.doctor.slug}
          doctorName={a.doctor.name}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onDone={() => setReviewed(true)}
        />
      ) : null}

      <div className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
        {t("appointments.bookedOn", {
          date: new Date(a.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "Asia/Dhaka",
          }),
        })}
      </div>
    </div>
  );
}
