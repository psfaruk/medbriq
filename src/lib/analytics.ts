"use client";

/**
 * First-party, privacy-respecting analytics (spec §17).
 *
 * Rules baked in:
 *  - Event names are a fixed whitelist; the server rejects anything else.
 *  - `meta` may only carry coarse, non-identifying counters (e.g. result
 *    counts). NEVER search text, health details, or user identifiers —
 *    the type signature makes it awkward and the server ignores extra keys.
 *  - Fire-and-forget: analytics must never break or slow the UI (keepalive,
 *    no awaiting, swallow all errors).
 */

export type AnalyticsEvent =
  | "page_view"
  | "doctor_search"
  | "hospital_search"
  | "profile_view_doctor"
  | "profile_view_hospital"
  | "article_view"
  | "symptom_view"
  | "equipment_view"
  | "cta_click"
  | "registration_start"
  | "registration_complete"
  | "booking_start"
  | "booking_confirmed";

export type AnalyticsMeta = {
  /** Coarse scope tag (view name) — never free text. */
  scope?: string;
  resultCount?: number;
};

/** Record an interaction. Never throws, never blocks. */
export function track(name: AnalyticsEvent, meta?: AnalyticsMeta): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, ...(meta ? { meta } : {}) });
    fetch("/api/v1/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never surface analytics errors */
  }
}

/** Convenience wrapper for CTAs — `label` is a fixed UI label, not user input. */
export function trackCta(label: string, scope?: string): void {
  track("cta_click", { scope: `${scope ?? ""}:${label}`.slice(0, 60) });
}
