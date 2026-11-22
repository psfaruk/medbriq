"use client";

/**
 * VvsFormDialog — patient-side two-part form dialog.
 *
 * Fetches the document payload (POST /api/v2/vvs/document), shows a scaled
 * A4 preview, and offers browser printing (exact A4) plus PDF download.
 * Re-download returns the SAME credential (safe reprint for a lost form);
 * a used credential renders an honest "USED" watermark instead of a
 * live QR.
 */

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT, fmtDateLong, fmtTime } from "@/components/app/shared/ui-kit";
import { apiPost } from "@/lib/api-client";
import type { VvsDocument } from "@/lib/vvs-types";
import VvsPrintSheet, { VVS_SHEET_CSS } from "./print-sheet";
import { A4_WIDTH_PX, VvsPrintPortal, vvsDownloadPdf, vvsPrint } from "./print-machine";

export default function VvsFormDialog({
  appointmentId,
  open,
  onOpenChange,
}: {
  appointmentId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useT();
  const [doc, setDoc] = useState<VvsDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.42);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const portalSheetRef = useRef<HTMLDivElement>(null);

  const fetchDoc = (format: "PRINT" | "PDF") => {
    setLoading(true);
    setError(null);
    apiPost<{ document: VvsDocument }>("/api/v2/vvs/document", {
      appointmentId,
      format,
    })
      .then((d) => setDoc(d.document))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : t("common.error"))
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      setDoc(null);
      fetchDoc("PRINT");
    }
     
  }, [open, appointmentId]);

  // Responsive preview scale (210mm sheet → container width).
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const update = () => setPreviewScale(Math.min(1, el.clientWidth / A4_WIDTH_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  const isVoid = doc ? doc.form.credentialState !== "ACTIVE" : false;

  const onDownload = async () => {
    if (!doc) return;
    // Log the PDF issuance + refresh (same credential returns).
    try {
      const d = await apiPost<{ document: VvsDocument }>(
        "/api/v2/vvs/document",
        { appointmentId, format: "PDF" }
      );
      setDoc(d.document);
    } catch {
      /* keep the already-fetched document — download still possible */
    }
    const sheet = portalSheetRef.current;
    if (!sheet) return;
    setDownloading(true);
    try {
      await vvsDownloadPdf(
        sheet,
        `Find Medi Doctor-Appointment-${doc.appointment.referenceCode}.pdf`
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <style>{VVS_SHEET_CSS}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="app-scroll max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("vvs.form.title")}
            </DialogTitle>
            <DialogDescription>
              {t("vvs.form.subtitle")}
            </DialogDescription>
          </DialogHeader>

          {loading && !doc ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border bg-muted/40 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("vvs.form.preparing")}
            </div>
          ) : error ? (
            <p
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : doc ? (
            <div className="w-full min-w-0 space-y-4">
              {isVoid ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {t("vvs.form.usedNotice")}
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {t("vvs.form.hint")}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{doc.appointment.doctor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateLong(doc.appointment.slotStart)} ·{" "}
                    {fmtTime(doc.appointment.slotStart)}
                    {doc.appointment.chamberName
                      ? ` · ${doc.appointment.chamberName}`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold">
                    {doc.appointment.referenceCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("vvs.serial")} #{doc.verification.serialNumber} ·{" "}
                    {doc.appointment.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              </div>

              {/* scaled A4 preview */}
              <div
                ref={previewWrapRef}
                className="app-scroll w-full min-w-0 overflow-auto rounded-xl border-2 border-border bg-neutral-100 p-3"
                style={{ maxHeight: "52vh" }}
                aria-label={t("vvs.form.previewLabel")}
              >
                <div
                  style={{
                    width: A4_WIDTH_PX * previewScale,
                    height: previewScale * (297 / 25.4) * 96,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <VvsPrintSheet doc={doc} />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => vvsPrint()}>
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  {t("vvs.form.print")}
                </Button>
                <Button onClick={onDownload} disabled={downloading}>
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t("vvs.form.download")}
                </Button>
              </div>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                {t("vvs.form.paperNote")}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* full-size offscreen sheet — used by BOTH print and PDF export */}
      <VvsPrintPortal>
        <div ref={portalSheetRef}>
          {doc ? <VvsPrintSheet doc={doc} /> : null}
        </div>
      </VvsPrintPortal>
    </>
  );
}
