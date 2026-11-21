"use client";

/**
 * VVS print machinery.
 *
 * - VvsPrintPortal renders the FULL-SIZE A4 sheet offscreen (positioned far
 *   left, never display:none so html2canvas can rasterize it) inside a
 *   portal at document.body. During window.print() a body class hides every
 *   other root element so exactly one A4 page prints — no clipping, no
 *   trailing blank pages.
 * - vvsPrint() triggers the browser print dialog (print-to-PDF supported).
 * - vvsDownloadPdf() rasterizes the same sheet via html2pdf.js into a
 *   downloadable A4 PDF (Bengali text renders through the browser engine).
 */

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/** Full-size print root portal — renders children offscreen at body level. */
export function VvsPrintPortal({ children }: { children: React.ReactNode }) {
  // Hydration-safe "is client" without setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  if (!mounted) return null;
  return createPortal(
    <div id="vvs-print-root" aria-hidden="true">
      {children}
    </div>,
    document.body
  );
}

/** Print only the VVS sheet (adds/removes the body-level print class). */
export function vvsPrint() {
  document.body.classList.add("vvs-printing");
  const cleanup = () => {
    document.body.classList.remove("vvs-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Safety net for browsers that never fire afterprint.
  setTimeout(cleanup, 60_000);
}

/** Rasterize the given sheet element into an A4 PDF download. */
export async function vvsDownloadPdf(
  sheetEl: HTMLElement,
  filename: string
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: "jpeg", quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(sheetEl)
    .save();
}

/**
 * Responsive A4 preview scale helper (the dialogs drive this through a
 * ResizeObserver — kept here for reuse).
 */
export function useA4PreviewScale() {
  return { scale: 0.42 };
}

/** 210mm in CSS pixels at 96dpi. */
export const A4_WIDTH_PX = 210 / 25.4 * 96; // ≈ 793.7
