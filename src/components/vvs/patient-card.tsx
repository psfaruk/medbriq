"use client";

/**
 * VvsPatientCard — the patient's Verified Visit panel on the appointment
 * details screen: form download/print, live verification state, patient
 * confirmation (Mode B), digital receipt and dispute reporting.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileDown,
  Flag,
  Loader2,
  QrCode,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
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
  SectionCard,
  useT,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { apiGet, apiPost } from "@/lib/api-client";
import type { AppointmentDto } from "@/lib/types";
import type { VvsStatus } from "@/lib/vvs-types";
import { useToast } from "@/hooks/use-toast";
import VvsFormDialog from "./form-dialog";
import VvsReceiptDialog from "./receipt";

export default function VvsPatientCard({
  appointment,
  onChanged,
}: {
  appointment: AppointmentDto;
  onChanged: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [status, setStatus] = useState<VvsStatus | null>(null);
  const [notIssued, setNotIssued] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let alive = true;
    setNotIssued(false);
    apiGet<VvsStatus>(`/api/v2/vvs/status/${appointment.id}`)
      .then((d) => {
        if (!alive) return;
        setStatus(d);
      })
      .catch(() => {
        // 404 — the form was never issued for this appointment.
        if (alive) {
          setStatus(null);
          setNotIssued(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [appointment.id, reloadKey]);

  const formable =
    appointment.status === "CONFIRMED" || appointment.status === "COMPLETED";
  const visit = status?.visit ?? null;
  const confirmation = status?.confirmation ?? null;
  const dispute = status?.dispute ?? null;
  const isPatientViewer = status?.viewer.isPatient ?? true;

  const confirmVisit = async () => {
    setConfirming(true);
    try {
      await apiPost(`/api/v2/vvs/patient-confirmation/${appointment.id}`, {});
      toast({ title: t("vvs.card.confirmed") });
      reload();
      onChanged();
    } catch (err) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const submitDispute = async () => {
    setDisputing(true);
    try {
      await apiPost("/api/v2/vvs/dispute", {
        appointmentId: appointment.id,
        reason: disputeReason.trim(),
      });
      toast({ title: t("vvs.card.reported"), description: t("vvs.card.reportedHint") });
      setDisputeOpen(false);
      setDisputeReason("");
      reload();
    } catch (err) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDisputing(false);
    }
  };

  const showFormCard = formable;
  const showVisitCard = !!visit;

  if (!showFormCard && !showVisitCard) return null;

  return (
    <>
      {/* ── appointment form ─────────────────────────────────────── */}
      {showFormCard ? (
        <SectionCard title={t("vvs.card.formTitle")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {notIssued && appointment.status === "CONFIRMED"
                ? t("vvs.card.formHint")
                : status?.verification.checkInAt
                  ? `${t("vvs.card.checkIn")} · ${fmtDateTime(status.verification.checkInAt)}`
                  : t("vvs.card.formHint")}
            </p>
            <Button onClick={() => setFormOpen(true)} className="shrink-0">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              {t("vvs.card.viewForm")}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {/* ── verified visit ───────────────────────────────────────── */}
      {visit ? (
        <SectionCard title={t("vvs.card.visitTitle")}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t("vvs.card.visitRecorded")}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {visit.receiptNumber}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {fmtDateTime(visit.completedAt)} · {visit.completedByName}
              </span>
            </div>

            {/* patient confirmation (Mode B) */}
            {confirmation ? (
              <div className="rounded-xl border bg-muted/40 px-4 py-3">
                {confirmation.status === "PENDING" && isPatientViewer ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("vvs.card.confirmHint")}
                    </p>
                    <Button
                      size="sm"
                      onClick={confirmVisit}
                      disabled={confirming}
                      className="shrink-0"
                    >
                      {confirming ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      {t("vvs.card.confirmBtn")}
                    </Button>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                    {confirmation.status === "CONFIRMED" ? (
                      <>
                        <ShieldCheck
                          className="h-4 w-4 text-emerald-600"
                          aria-hidden="true"
                        />
                        {t("vvs.card.confirmedVia", {
                          via:
                            confirmation.confirmedVia === "APP"
                              ? t("common.online").toLowerCase()
                              : "code",
                        })}
                      </>
                    ) : confirmation.status === "EXPIRED" ? (
                      <>
                        <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        {t("vvs.card.expired")}
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {t("vvs.doctor.confirmPending")}
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : null}

            {/* dispute state */}
            {visit.correctionStatus === "CORRECTED" ? (
              <p className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {t("vvs.card.corrected")}
                {visit.correctionReason ? ` — ${visit.correctionReason}` : ""}
              </p>
            ) : dispute ? (
              <p className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Flag className="h-4 w-4" aria-hidden="true" />
                {t("vvs.card.disputed")}
                {dispute.resolution ? ` — ${dispute.resolution}` : ""}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptOpen(true)}
              >
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
                {t("vvs.card.viewReceipt")}
              </Button>
              {isPatientViewer &&
              !visit.correctionStatus &&
              !dispute &&
              appointment.status === "COMPLETED" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDisputeOpen(true)}
                >
                  <Flag className="h-4 w-4" aria-hidden="true" />
                  {t("vvs.card.report")}
                </Button>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* ── dialogs ──────────────────────────────────────────────── */}
      <VvsFormDialog
        appointmentId={appointment.id}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
      <VvsReceiptDialog
        appointmentId={appointment.id}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("vvs.card.reportTitle")}</DialogTitle>
            <DialogDescription>{t("vvs.card.reportHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="vvs-dispute-reason">
              {t("vvs.card.reportReason")}
            </Label>
            <Textarea
              id="vvs-dispute-reason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value.slice(0, 1000))}
              rows={3}
              placeholder="e.g. I did not attend this consultation"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisputeOpen(false)}
              disabled={disputing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitDispute}
              disabled={disputing || disputeReason.trim().length < 10}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disputing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden="true" />
              )}
              {t("vvs.card.reportSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
