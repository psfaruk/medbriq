"use client";

/**
 * VvsPrintSheet — the two-part A4 appointment form.
 *
 * Layout (exact A4, 210mm × 297mm, zero page margins):
 *   ┌─────────────────────────────┐
 *   │  PATIENT COPY  (upper)      │  patient keeps, presents at chamber
 *   ├───── ✂ perforation ─────────┤  dashed cutting guide
 *   │  DOCTOR COPY   (lower)      │  doctor detaches & retains
 *   └─────────────────────────────┘
 *
 * Both parts carry the SAME appointment reference, verifiable QR and manual
 * code. Print-safe monochrome palette; bilingual labels (English / বাংলা);
 * signature + institution-stamp areas; print date, document version and
 * booking status on both parts. No medical data is printed (minimum-
 * necessary privacy rule, docs/VVS.md §11).
 */

import { fmtDateLong, fmtTime } from "@/components/app/shared/ui-kit";
import type { VvsDocument } from "@/lib/vvs-types";

export const VVS_SHEET_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body.vvs-printing > *:not(#vvs-print-root) { display: none !important; }
  #vvs-print-root {
    display: block !important;
    position: static !important;
    left: auto !important; top: auto !important;
    width: auto !important; height: auto !important;
    overflow: visible !important; z-index: auto !important;
  }
  .vvs-sheet { box-shadow: none !important; }
}
#vvs-print-root { position: fixed; left: -11000px; top: 0; width: 210mm; }
.vvs-sheet {
  width: 210mm; height: 297mm; background: #ffffff; color: #000000;
  font-family: var(--font-inter), var(--font-bengali), Arial, sans-serif;
  display: flex; flex-direction: column; overflow: hidden;
  box-sizing: border-box;
}
.vvs-part { flex: 1 1 0; display: flex; flex-direction: column; padding: 9mm 10mm 6mm; box-sizing: border-box; min-height: 0; }
.vvs-perf {
  height: 8mm; position: relative; display: flex; align-items: center; justify-content: center;
  border-top: 1px dashed #444; border-bottom: 1px dashed #444; background: #fff;
}
.vvs-perf span {
  position: absolute; background: #fff; padding: 0 6mm;
  font-size: 7pt; letter-spacing: 0.22em; color: #444; text-transform: uppercase;
}
.vvs-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 2.2mm; gap: 3mm; }
.vvs-brand { font-size: 15pt; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.vvs-brand small { display: block; font-size: 7pt; font-weight: 600; letter-spacing: 0.14em; color: #333; margin-top: 1mm; }
.vvs-copytag {
  border: 1.6px solid #000; padding: 1.2mm 3mm; font-size: 8.5pt; font-weight: 800; letter-spacing: 0.12em; text-align: center; line-height: 1.25;
}
.vvs-copytag small { display: block; font-size: 7pt; font-weight: 600; letter-spacing: 0.04em; }
.vvs-refrow { display: flex; align-items: baseline; gap: 4mm; margin: 2.6mm 0 2.2mm; flex-wrap: wrap; }
.vvs-ref { font-size: 15.5pt; font-weight: 800; letter-spacing: 0.06em; font-family: ui-monospace, Menlo, monospace; }
.vvs-reflbl { font-size: 7.5pt; color: #333; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.vvs-body { display: flex; gap: 6mm; flex: 1; min-height: 0; }
.vvs-info { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0 6mm; align-content: start; }
.vvs-field { border-bottom: 0.6px solid #bbb; padding: 1.5mm 0 1.2mm; min-width: 0; }
.vvs-field.wide { grid-column: 1 / -1; }
.vvs-k { font-size: 6.8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #444; font-weight: 700; }
.vvs-kbn { font-weight: 600; color: #555; }
.vvs-v { font-size: 10pt; font-weight: 700; margin-top: 0.4mm; overflow-wrap: anywhere; }
.vvs-v.sm { font-size: 8.5pt; font-weight: 600; }
.vvs-qr { width: 44mm; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; border: 1px solid #000; padding: 2.5mm 2mm 2mm; box-sizing: border-box; }
.vvs-qr img { width: 38mm; height: 38mm; display: block; }
.vvs-qr .cap { font-size: 7pt; font-weight: 800; letter-spacing: 0.06em; margin-top: 1.4mm; text-align: center; line-height: 1.35; }
.vvs-manual { margin-top: 1.6mm; font-size: 9.5pt; font-weight: 800; font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.28em; }
.vvs-manual-lbl { font-size: 6.2pt; color: #444; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; margin-top: 0.8mm; text-align: center; }
.vvs-sign { display: flex; gap: 5mm; margin-top: 2.4mm; }
.vvs-signbox { flex: 1; border: 1px solid #000; height: 15mm; padding: 1.2mm 2mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
.vvs-signbox .lbl { font-size: 6.4pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #333; }
.vvs-signbox .ln { font-size: 6.2pt; color: #777; }
.vvs-foot { margin-top: 2.2mm; border-top: 0.6px solid #999; padding-top: 1.4mm; font-size: 6.4pt; color: #333; line-height: 1.5; display: flex; justify-content: space-between; gap: 4mm; }
.vvs-status { border: 1.2px solid #000; font-size: 8pt; font-weight: 800; padding: 0.8mm 2.4mm; letter-spacing: 0.1em; white-space: nowrap; }
.vvs-void { position: relative; }
.vvs-void .vvs-qr img { opacity: 0.18; }
.vvs-void .vvs-voidtag {
  position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-8deg);
  border: 1.6px solid #000; padding: 1mm 3mm; font-size: 9pt; font-weight: 800; letter-spacing: 0.18em; background: #fff;
}
`;

function Field({
  k,
  kbn,
  v,
  sm,
  wide,
}: {
  k: string;
  kbn: string;
  v: string;
  sm?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`vvs-field${wide ? " wide" : ""}`}>
      <div className="vvs-k">
        {k} <span className="vvs-kbn">/ {kbn}</span>
      </div>
      <div className={`vvs-v${sm ? " sm" : ""}`}>{v || "—"}</div>
    </div>
  );
}

function SheetPart({
  doc,
  part,
}: {
  doc: VvsDocument;
  part: "PATIENT" | "DOCTOR";
}) {
  const { appointment: a, verification: v, doctor, form } = doc;
  const statusLabel = a.status.replace(/_/g, " ");
  const isVoid = form.credentialState !== "ACTIVE";

  return (
    <div className="vvs-part">
      <div className="vvs-head">
        <div className="vvs-brand">
          Find Medi Doctor
          <small>VERIFIED APPOINTMENT · ভেরিফায়েড অ্যাপয়েন্টমেন্ট</small>
        </div>
        <div className="vvs-copytag">
          {part === "PATIENT" ? (
            <>
              PATIENT COPY
              <small>রোগীর কপি — সাথে আনুন</small>
            </>
          ) : (
            <>
              DOCTOR COPY
              <small>ডাক্তারের কপি — চেম্বারে রাখুন</small>
            </>
          )}
        </div>
        <div className="vvs-status">{statusLabel}</div>
      </div>

      <div className="vvs-refrow">
        <span className="vvs-reflbl">Appointment ID / অ্যাপয়েন্টমেন্ট আইডি</span>
        <span className="vvs-ref">{a.referenceCode}</span>
        <span className="vvs-reflbl">Serial / সিরিয়াল — #{v.serialNumber}</span>
      </div>

      <div className="vvs-body">
        <div className="vvs-info">
          <Field k="Doctor" kbn="ডাক্তার" v={doctor.name} />
          <Field k="BMDC Reg. No" kbn="রেজি. নম্বর" v={doctor.regNumber ?? "—"} sm />
          <Field k="Specialty" kbn="বিশেষত্ব" v={doctor.specialties.join(", ")} sm />
          <Field
            k="Chamber / Location"
            kbn="চেম্বার"
            v={a.chamberName ?? "Doctor's chamber"}
            sm
          />
          <Field k="Date" kbn="তারিখ" v={fmtDateLong(a.slotStart)} />
          <Field
            k="Time"
            kbn="সময়"
            v={`${fmtTime(a.slotStart)} – ${fmtTime(a.slotEnd)}`}
          />
          <Field k="Patient Name" kbn="রোগীর নাম" v={a.patientName} />
          <Field k="Patient Phone" kbn="মোবাইল" v={a.patientPhone} sm />
          <Field
            k="Age / Gender"
            kbn="বয়স / লিঙ্গ"
            v={`${a.patientAge != null ? `${a.patientAge} yrs` : "—"}${
              a.patientGender ? ` · ${a.patientGender}` : ""
            }`}
            sm
          />
          <Field
            k="Patient Type"
            kbn="রোগীর ধরন"
            v={
              a.patientType
                ? a.patientType === "NEW"
                  ? "New / নতুন"
                  : a.patientType === "RETURNING"
                    ? "Returning / পুরাতন"
                    : "Follow-up / ফলো-আপ"
                : "—"
            }
            sm
          />
          <Field
            k="Consultation Fee"
            kbn="ফি"
            v={`${a.currency} ${a.fee.toLocaleString("en-US")}`}
          />
          <Field
            k="Payment"
            kbn="পেমেন্ট"
            v={a.paymentStatus.replace(/_/g, " ")}
            sm
          />
        </div>

        <div className={`vvs-qr${isVoid ? " vvs-void" : ""}`}>
          {isVoid ? <span className="vvs-voidtag">USED</span> : null}
          {form.qrDataUrl ? (
            <img src={form.qrDataUrl} alt="QR verification code" />
          ) : (
            <div style={{ width: "38mm", height: "38mm", border: "1px dashed #999" }} />
          )}
          <div className="cap">
            Scan to verify
            <br />
            যাচাই করতে স্ক্যান করুন
          </div>
          {form.manualCode ? (
            <>
              <div className="vvs-manual">{form.manualCode}</div>
              <div className="vvs-manual-lbl">Manual code · ম্যানুয়াল কোড</div>
            </>
          ) : null}
        </div>
      </div>

      <div className="vvs-sign">
        <div className="vvs-signbox">
          <span className="lbl">Patient signature · রোগীর স্বাক্ষর</span>
          <span className="ln">Signature / date</span>
        </div>
        <div className="vvs-signbox">
          <span className="lbl">Doctor signature · ডাক্তারের স্বাক্ষর</span>
          <span className="ln">Signature / date</span>
        </div>
        {part === "DOCTOR" ? (
          <div className="vvs-signbox">
            <span className="lbl">Institution stamp · প্রতিষ্ঠানের সিল</span>
            <span className="ln">Official seal</span>
          </div>
        ) : (
          <div className="vvs-signbox">
            <span className="lbl">Verified by Find Medi Doctor</span>
            <span className="ln">Doc v{form.documentVersion} · VVS</span>
          </div>
        )}
      </div>

      <div className="vvs-foot">
        <span>
          Present this form at the chamber. The doctor scans the QR to verify
          and record your visit digitally. · চেম্বারে এই ফরমটি দেখান। ডাক্তার QR
          স্ক্যান করে ভিজিট রেকর্ড করবেন। This form confirms a booking — it is not
          proof of consultation. The digital record is authoritative.
        </span>
        <span style={{ whiteSpace: "nowrap", textAlign: "right" }}>
          Printed:{" "}
          {new Date(form.printDate).toLocaleString("en-GB", {
            timeZone: "Asia/Dhaka",
          })}
          <br />
          Doc v{form.documentVersion} · {statusLabel}
        </span>
      </div>
    </div>
  );
}

/** The full two-part A4 sheet (both copies + perforation). */
export default function VvsPrintSheet({ doc }: { doc: VvsDocument }) {
  return (
    <div
      className="vvs-sheet"
      role="document"
      aria-label="Two-part appointment form"
    >
      <SheetPart doc={doc} part="PATIENT" />
      <div className="vvs-perf" aria-hidden="true">
        <span>✂ Cut here · এখানে কাটুন</span>
      </div>
      <SheetPart doc={doc} part="DOCTOR" />
    </div>
  );
}
