"use client";

/**
 * Appointment action parts shared by the Queue and Appointments sections:
 *  - AppointmentActionButtons — status-aware action row
 *  - AppointmentActionDialogs — confirm / reason / consultation-note dialogs
 *  - AppointmentDetailsDialog — full record view with actions
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AppointmentStatusBadge,
  PaymentStatusBadge,
  PatientTypeBadge,
  Money,
  fmtDateLong,
  fmtDateTime,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { apiPost } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentDto } from "@/lib/types";
import { errMessage, genderLabel } from "../helpers";

export type ApptActionKind =
  | "approve"
  | "reject"
  | "complete"
  | "no-show"
  | "cancel";

export type PendingApptAction = { kind: ApptActionKind; appt: AppointmentDto };

// ── Status-aware action buttons ────────────────────────────────────

export function AppointmentActionButtons({
  appt,
  onAction,
  size = "sm",
}: {
  appt: AppointmentDto;
  onAction: (kind: ApptActionKind, appt: AppointmentDto) => void;
  size?: "sm" | "default";
}) {
  const cls = size === "sm" ? "h-8 px-3 text-xs" : undefined;
  if (appt.status === "PENDING_APPROVAL") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className={cls}
          onClick={() => onAction("approve", appt)}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`${cls ?? ""} border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40`}
          onClick={() => onAction("reject", appt)}
        >
          Reject
        </Button>
      </div>
    );
  }
  if (appt.status === "CONFIRMED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className={cls}
          onClick={() => onAction("complete", appt)}
        >
          Complete
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cls}
          onClick={() => onAction("no-show", appt)}
        >
          No-show
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`${cls ?? ""} text-destructive hover:bg-destructive/5 hover:text-destructive`}
          onClick={() => onAction("cancel", appt)}
        >
          Cancel
        </Button>
      </div>
    );
  }
  return null;
}

// ── Action dialogs (one component, driven by PendingApptAction) ────

export function AppointmentActionDialogs({
  action,
  onClose,
  onChanged,
}: {
  action: PendingApptAction | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const appt = action?.appt ?? null;

  const run = async (
    url: string,
    body: unknown,
    successTitle: string,
    successDescription?: string
  ) => {
    if (!appt) return;
    setBusy(true);
    try {
      await apiPost<{ appointment: AppointmentDto }>(url, body);
      toast({ title: successTitle, description: successDescription });
      onClose();
      setReason("");
      setNote("");
      setFieldError(null);
      onChanged();
    } catch (err) {
      toast({
        title: "Action failed",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const resetAndClose = () => {
    if (busy) return;
    setReason("");
    setNote("");
    setFieldError(null);
    onClose();
  };

  if (!action || !appt) return null;

  const patient = appt.patientName;
  const ref = appt.referenceCode;

  // ── Approve (simple confirm) ──
  if (action.kind === "approve") {
    return (
      <AlertDialog open onOpenChange={(open) => !open && resetAndClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {patient} · {ref} · {fmtDateLong(appt.slotStart)} at{" "}
              {fmtTime(appt.slotStart)}. The patient will be notified and the
              booking becomes confirmed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                run(
                  `/api/v1/appointments/${appt.id}/approve`,
                  undefined,
                  "Appointment approved",
                  `${ref} is now confirmed.`
                );
              }}
            >
              {busy ? "Approving…" : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // ── No-show (simple confirm) ──
  if (action.kind === "no-show") {
    return (
      <AlertDialog open onOpenChange={(open) => !open && resetAndClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as no-show?</AlertDialogTitle>
            <AlertDialogDescription>
              {patient} did not attend {ref} on {fmtDateLong(appt.slotStart)}{" "}
              at {fmtTime(appt.slotStart)}. The patient will be notified. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                run(
                  `/api/v1/appointments/${appt.id}/no-show`,
                  undefined,
                  "Marked as no-show",
                  `${ref} was recorded as a no-show.`
                );
              }}
            >
              {busy ? "Saving…" : "Mark no-show"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // ── Reject (reason required, min 3 chars) ──
  if (action.kind === "reject") {
    return (
      <Dialog open onOpenChange={(open) => !open && resetAndClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject appointment request</DialogTitle>
            <DialogDescription>
              {patient} · {ref}. The patient will see you rejected this
              request, but your reason stays private to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFieldError(null);
              }}
              placeholder="Reason (required, at least 3 characters) — e.g. slot conflicts with an emergency case"
              rows={3}
              maxLength={300}
              aria-invalid={fieldError ? true : undefined}
            />
            {fieldError ? (
              <p className="text-xs font-medium text-destructive">
                {fieldError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const trimmed = reason.trim();
                if (trimmed.length < 3) {
                  setFieldError("Please enter a reason of at least 3 characters.");
                  return;
                }
                run(
                  `/api/v1/appointments/${appt.id}/reject`,
                  { reason: trimmed },
                  "Request rejected",
                  `${ref} was rejected.`
                );
              }}
            >
              {busy ? "Rejecting…" : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Cancel (optional reason) ──
  if (action.kind === "cancel") {
    return (
      <Dialog open onOpenChange={(open) => !open && resetAndClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this appointment?</DialogTitle>
            <DialogDescription>
              {patient} · {ref} · {fmtDateLong(appt.slotStart)} at{" "}
              {fmtTime(appt.slotStart)}. Any online payment already made will
              be refunded and the patient will be notified. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional, shared with the patient) — e.g. doctor unavailable that day"
              rows={3}
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose} disabled={busy}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const trimmed = reason.trim();
                run(
                  `/api/v1/appointments/${appt.id}/cancel`,
                  trimmed ? { reason: trimmed } : undefined,
                  "Appointment cancelled",
                  `${ref} was cancelled.`
                );
              }}
            >
              {busy ? "Cancelling…" : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Complete (optional consultation note) ──
  return (
    <Dialog open onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete consultation</DialogTitle>
          <DialogDescription>
            {patient} · {ref} · {fmtDateLong(appt.slotStart)} at{" "}
            {fmtTime(appt.slotStart)}. Completing records the visit in this
            patient&apos;s history with you — it establishes returning-patient
            eligibility.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Consultation note (optional) — diagnosis, advice, follow-up plan…"
            rows={5}
            maxLength={2000}
          />
          <p className="text-[11px] text-muted-foreground">
            {note.length}/2000 characters
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              const trimmed = note.trim();
              run(
                `/api/v1/appointments/${appt.id}/complete`,
                { consultationNote: trimmed.length > 0 ? trimmed : null },
                "Consultation completed",
                `${ref} is recorded in your patient history.`
              );
            }}
          >
            {busy ? "Saving…" : "Complete visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared hook: action state + dialogs + details dialog ───────────

export function useApptActions(onChanged: () => void) {
  const [pending, setPending] = useState<PendingApptAction | null>(null);
  const [details, setDetails] = useState<AppointmentDto | null>(null);

  const dialogs = (
    <>
      <AppointmentActionDialogs
        action={pending}
        onClose={() => setPending(null)}
        onChanged={onChanged}
      />
      <AppointmentDetailsDialog
        appt={details}
        onClose={() => setDetails(null)}
        onAction={(kind, appt) => {
          setDetails(null);
          setPending({ kind, appt });
        }}
      />
    </>
  );

  return {
    run: (kind: ApptActionKind, appt: AppointmentDto) =>
      setPending({ kind, appt }),
    openDetails: (appt: AppointmentDto) => setDetails(appt),
    dialogs,
  };
}

// ── Details dialog ─────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function AppointmentDetailsDialog({
  appt,
  onClose,
  onAction,
}: {
  appt: AppointmentDto | null;
  onClose: () => void;
  onAction: (kind: ApptActionKind, appt: AppointmentDto) => void;
}) {
  if (!appt) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{appt.referenceCode}</span>
            <AppointmentStatusBadge status={appt.status} />
          </DialogTitle>
          <DialogDescription>
            Appointment record — created {fmtDateTime(appt.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Patient
            </h3>
            <dl className="divide-y divide-border/60">
              <DetailRow label="Name" value={appt.patientName} />
              <DetailRow label="Phone" value={appt.patientPhone} />
              <DetailRow
                label="Age / Gender"
                value={`${appt.patientAge ?? "—"} · ${genderLabel(appt.patientGender)}`}
              />
              <DetailRow
                label="Classification"
                value={
                  <span className="flex justify-end">
                    <PatientTypeBadge type={appt.patientType} />
                  </span>
                }
              />
            </dl>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Schedule
            </h3>
            <dl className="divide-y divide-border/60">
              <DetailRow label="Date" value={fmtDateLong(appt.slotStart)} />
              <DetailRow
                label="Time"
                value={`${fmtTime(appt.slotStart)} – ${fmtTime(appt.slotEnd)}`}
              />
              <DetailRow
                label="Chamber"
                value={appt.chamberName ?? "Not specified"}
              />
              <DetailRow
                label="Booking mode"
                value={
                  appt.bookingMode === "APPROVAL"
                    ? "Doctor approval"
                    : "Instant booking"
                }
              />
              <DetailRow label="Visit type" value={appt.type === "VIDEO" ? "Video" : "In person"} />
            </dl>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Pricing &amp; payment
            </h3>
            <dl className="divide-y divide-border/60">
              <DetailRow
                label="Fee"
                value={<Money amount={appt.fee} currency={appt.currency} />}
              />
              <DetailRow
                label="Payment"
                value={
                  <span className="flex justify-end">
                    <PaymentStatusBadge status={appt.paymentStatus} />
                  </span>
                }
              />
              <DetailRow
                label="Refund"
                value={
                  appt.refundStatus === "NONE" ? "—" : appt.refundStatus
                }
              />
              <DetailRow
                label="Fee version"
                value={
                  appt.feeSettingsVersion !== null
                    ? `v${appt.feeSettingsVersion}${appt.pricedAt ? ` · priced ${fmtDateTime(appt.pricedAt)}` : ""}`
                    : "—"
                }
              />
            </dl>
          </section>

          {appt.notes || appt.doctorNote || appt.consultationNote ? (
            <section>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Notes
              </h3>
              <div className="space-y-2">
                {appt.notes ? (
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Patient&apos;s note
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">{appt.notes}</p>
                  </div>
                ) : null}
                {appt.doctorNote ? (
                  <div className="rounded-xl bg-muted/60 px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Doctor note (private)
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {appt.doctorNote}
                    </p>
                  </div>
                ) : null}
                {appt.consultationNote ? (
                  <div className="rounded-xl bg-primary-soft px-3 py-2">
                    <p className="text-[11px] font-semibold text-primary">
                      Consultation note
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {appt.consultationNote}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <Separator className="my-1" />
        <div className="flex flex-wrap justify-end gap-2">
          <AppointmentActionButtons appt={appt} onAction={onAction} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
