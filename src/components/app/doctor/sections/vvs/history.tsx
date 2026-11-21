"use client";

/**
 * VvsHistory — the doctor's completed-visit history: receipts, verification
 * methods, patient-confirmation state, corrections and disputes.
 */

import { useEffect, useState } from "react";
import { History, ReceiptText } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  SectionCard,
  fmtDateLong,
  fmtDateTime,
  fmtTime,
  useT,
} from "@/components/app/shared/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api-client";
import type { VvsVisit } from "@/lib/vvs-types";
import VvsReceiptDialog from "@/components/vvs/receipt";

export default function VvsHistory() {
  const { t } = useT();
  const [items, setItems] = useState<VvsVisit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let alive = true;
    apiGet<{ items: VvsVisit[] }>("/api/v2/vvs/doctor/visits?limit=100")
      .then((d) => {
        if (!alive) return;
        setItems(d.items);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey, t]);

  if (loading && !items) return <LoadingCard rows={5} />;
  if (error && !items) return <ErrorState message={error} onRetry={reload} />;
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title={t("vvs.doctor.historyEmpty")}
        hint={t("vvs.doctor.historyHint")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((v) => (
        <SectionCard key={v.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{v.patientName}</span>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {v.receiptNumber}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {t("vvs.doctor.method")}: {v.verificationMethod.replace("_", " ")}
                </Badge>
                {v.patientConfirmationStatus === "CONFIRMED" ? (
                  <Badge className="bg-emerald-100 text-[11px] text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                    {t("vvs.doctor.confirmConfirmed")}
                  </Badge>
                ) : v.patientConfirmationStatus === "PENDING" ? (
                  <Badge variant="outline" className="text-[11px] text-amber-700">
                    {t("vvs.doctor.confirmPending")}
                  </Badge>
                ) : null}
                {v.correctionStatus === "DISPUTED" ? (
                  <Badge className="bg-amber-100 text-[11px] text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                    {t("vvs.card.disputed")}
                  </Badge>
                ) : null}
                {v.correctionStatus === "CORRECTED" ? (
                  <Badge className="bg-amber-100 text-[11px] text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                    {t("vvs.card.corrected")}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {fmtDateLong(v.slotStart)} · {fmtTime(v.slotStart)}
                </span>
                <span className="font-mono">{v.referenceCode}</span>
                <span>{v.chamberName ?? "—"}</span>
                <span>৳{v.fee.toLocaleString("en-US")}</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("vvs.card.visitRecorded")} · {fmtDateTime(v.completedAt)} ·{" "}
                {v.completedByName}
              </p>
              {v.consultationNote ? (
                <p className="mt-2 line-clamp-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                  {v.consultationNote}
                </p>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptFor(v.appointmentId)}
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              {t("vvs.card.viewReceipt")}
            </Button>
          </div>
        </SectionCard>
      ))}

      <VvsReceiptDialog
        appointmentId={receiptFor ?? ""}
        open={!!receiptFor}
        onOpenChange={(o) => !o && setReceiptFor(null)}
      />
    </div>
  );
}
