"use client";

/**
 * VVS digital visit receipt — printable/PDF view.
 *
 * The receipt is assembled server-side from the immutable CompletedVisit
 * record (fee snapshot frozen at completion). It is the AUTHORITATIVE proof
 * a consultation was recorded — the paper appointment form is not
 * (recommendation #1: keep paper form and digital receipt separate).
 */

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT, fmtDateLong, fmtDateTime, fmtTime } from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import type { VvsReceipt } from "@/lib/vvs-types";
import { A4_WIDTH_PX, VvsPrintPortal, vvsDownloadPdf, vvsPrint } from "./print-machine";

export const VVS_RECEIPT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body.vvs-printing > *:not(#vvs-print-root) { display: none !important; }
  #vvs-print-root {
    display: block !important; position: static !important;
    left: auto !important; top: auto !important;
    width: auto !important; height: auto !important;
    overflow: visible !important; z-index: auto !important;
  }
}
#vvs-print-root { position: fixed; left: -11000px; top: 0; width: 210mm; }
.vvs-rcpt {
  width: 210mm; min-height: 148mm; background: #fff; color: #000; box-sizing: border-box;
  padding: 12mm 14mm; font-family: var(--font-inter), var(--font-bengali), Arial, sans-serif;
}
.vvs-rcpt-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #000; padding-bottom: 3mm; }
.vvs-rcpt-brand { font-size: 16pt; font-weight: 800; }
.vvs-rcpt-brand small { display: block; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.16em; color: #333; margin-top: 1mm; }
.vvs-rcpt-no { text-align: right; }
.vvs-rcpt-no .lbl { font-size: 7pt; letter-spacing: 0.12em; font-weight: 700; color: #444; }
.vvs-rcpt-no .val { font-size: 13pt; font-weight: 800; font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.05em; }
.vvs-rcpt-title { text-align: center; font-size: 11.5pt; font-weight: 800; letter-spacing: 0.3em; margin: 5mm 0 4mm; text-transform: uppercase; }
.vvs-rcpt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8mm; }
.vvs-rcpt-f { border-bottom: 0.6px solid #bbb; padding: 1.6mm 0 1.3mm; }
.vvs-rcpt-f.wide { grid-column: 1 / -1; }
.vvs-rcpt-k { font-size: 7pt; letter-spacing: 0.1em; text-transform: uppercase; color: #444; font-weight: 700; }
.vvs-rcpt-v { font-size: 10.5pt; font-weight: 700; margin-top: 0.4mm; }
.vvs-rcpt-seal {
  margin-top: 6mm; border: 1.4px solid #000; padding: 3mm 4mm; display: flex; justify-content: space-between; align-items: center; gap: 4mm;
}
.vvs-rcpt-seal .t { font-size: 8pt; font-weight: 800; letter-spacing: 0.1em; }
.vvs-rcpt-seal .s { font-size: 7pt; color: #444; line-height: 1.5; }
.vvs-rcpt-foot { margin-top: 5mm; font-size: 7pt; color: #333; line-height: 1.6; border-top: 0.6px solid #999; padding-top: 2mm; display: flex; justify-content: space-between; gap: 6mm; }
`;

function Row({ k, kbn, v, wide }: { k: string; kbn: string; v: string; wide?: boolean }) {
  return (
    <div className={`vvs-rcpt-f${wide ? " wide" : ""}`}>
      <div className="vvs-rcpt-k">
        {k} / {kbn}
      </div>
      <div className="vvs-rcpt-v">{v || "—"}</div>
    </div>
  );
}

export function VvsReceiptSheet({ r }: { r: VvsReceipt }) {
  const confirmLabel =
    r.patientConfirmationStatus === "CONFIRMED"
      ? `Confirmed · ${r.patientConfirmedVia === "APP" ? "in app" : "with code"}`
      : r.patientConfirmationStatus === "PENDING"
        ? "Awaiting patient confirmation"
        : r.patientConfirmationStatus === "EXPIRED"
          ? "Confirmation window expired"
          : "Not required";
  return (
    <div className="vvs-rcpt" role="document" aria-label="Digital visit receipt">
      <div className="vvs-rcpt-head">
        <div className="vvs-rcpt-brand">
          Find Medi Doctor
          <small>VERIFIED VISIT SYSTEM · VVS</small>
        </div>
        <div className="vvs-rcpt-no">
          <div className="lbl">RECEIPT NO / রসিদ নম্বর</div>
          <div className="val">{r.receiptNumber}</div>
        </div>
      </div>

      <div className="vvs-rcpt-title">
        Digital Visit Receipt · ডিজিটাল ভিজিট রসিদ
      </div>

      <div className="vvs-rcpt-grid">
        <Row k="Appointment ID" kbn="অ্যাপয়েন্টমেন্ট আইডি" v={r.referenceCode} />
        <Row k="Serial No" kbn="সিরিয়াল" v={`#${r.serialNumber}`} />
        <Row k="Doctor" kbn="ডাক্তার" v={r.doctorName} />
        <Row k="BMDC Reg." kbn="রেজি. নম্বর" v={r.doctorRegNumber ?? "—"} />
        <Row k="Chamber" kbn="চেম্বার" v={r.chamberName ?? "—"} />
        <Row k="Patient" kbn="রোগী" v={r.patientName} />
        <Row
          k="Appointment"
          kbn="সময়"
          v={`${fmtDateLong(r.slotStart)} · ${fmtTime(r.slotStart)}`}
        />
        <Row
          k="Patient Type"
          kbn="রোগীর ধরন"
          v={r.patientType ?? "—"}
        />
        <Row
          k="Fee (at booking)"
          kbn="ফি"
          v={`${r.currency} ${r.fee.toLocaleString("en-US")}`}
        />
        <Row
          k="Completed At"
          kbn="সম্পন্ন"
          v={fmtDateTime(r.completedAt)}
        />
        <Row
          k="Verified By"
          kbn="যাচাইকারী"
          v={`${r.completedByName} · ${r.verificationMethod.replace("_", " ")}`}
        />
        <Row k="Patient Confirmation" kbn="রোগীর নিশ্চিতকরণ" v={confirmLabel} />
        {r.correctionStatus ? (
          <Row
            k="Correction"
            kbn="সংশোধন"
            v={`${r.correctionStatus}${r.correctionReason ? ` — ${r.correctionReason}` : ""}`}
            wide
          />
        ) : null}
      </div>

      <div className="vvs-rcpt-seal">
        <div>
          <div className="t"> digitally verified visit record </div>
          <div className="s">
            This receipt was generated by the Find Medi Doctor Verified Visit System
            from the doctor&apos;s authorized completion. It is the
            authoritative record of the consultation.
          </div>
        </div>
        <div className="s" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          Issued {fmtDateTime(r.issuedAt)}
          <br />
          Policy {r.policy} · Doc VVS-1
        </div>
      </div>

      <div className="vvs-rcpt-foot">
        <span>
          এই রসিদটি Find Medi Doctor Verified Visit System থেকে তৈরি — ডাক্তারের
          অনুমোদিত সম্পন্নকরণ থেকে। Retention &amp; privacy: per platform policy
          (docs/VVS.md §11).
        </span>
      </div>
    </div>
  );
}

export default function VvsReceiptDialog({
  appointmentId,
  open,
  onOpenChange,
}: {
  appointmentId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useT();
  const [receipt, setReceipt] = useState<VvsReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.42);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const portalSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setReceipt(null);
    setError(null);
    setLoading(true);
    apiGet<{ receipt: VvsReceipt }>(`/api/v2/vvs/receipt/${appointmentId}`)
      .then((d) => setReceipt(d.receipt))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : t("common.error"))
      )
      .finally(() => setLoading(false));
     
  }, [open, appointmentId]);

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el || !receipt) return;
    const update = () => setPreviewScale(Math.min(1, el.clientWidth / A4_WIDTH_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [receipt]);

  const onDownload = async () => {
    if (!receipt) return;
    const sheet = portalSheetRef.current;
    if (!sheet) return;
    setDownloading(true);
    try {
      await vvsDownloadPdf(sheet, `Find Medi Doctor-Receipt-${receipt.receiptNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <style>{VVS_RECEIPT_CSS}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="app-scroll max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("vvs.receipt.title")}
            </DialogTitle>
            <DialogDescription>{t("vvs.receipt.subtitle")}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border bg-muted/40 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("common.loading")}
            </div>
          ) : error ? (
            <p
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : receipt ? (
            <div className="w-full min-w-0 space-y-4">
              <div
                ref={previewWrapRef}
                className="app-scroll w-full min-w-0 overflow-auto rounded-xl border-2 border-border bg-neutral-100 p-3"
                style={{ maxHeight: "52vh" }}
                aria-label={t("vvs.receipt.title")}
              >
                <div
                  style={{
                    width: A4_WIDTH_PX * previewScale,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <VvsReceiptSheet r={receipt} />
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
                  {t("vvs.receipt.download")}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <VvsPrintPortal>
        <div ref={portalSheetRef}>
          {receipt ? <VvsReceiptSheet r={receipt} /> : null}
        </div>
      </VvsPrintPortal>
    </>
  );
}
