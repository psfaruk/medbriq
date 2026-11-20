"use client";

/**
 * Doctor dashboard shared helpers — pure functions only (no React), so every
 * section can import them without pulling component code.
 */

import type { AppointmentDto } from "@/lib/types";

/** Extract a human-readable message from a thrown ApiCallError/Error. */
export function errMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

/** Money as a plain string (matches the shared Money component format). */
export function fmtMoney(amount: number, currency = "BDT"): string {
  const rounded = Math.round(amount).toLocaleString("en-US");
  return currency === "BDT" ? `৳ ${rounded}` : `${currency} ${rounded}`;
}

/**
 * Normalize a Bangladeshi mobile number to the canonical "+8801XXXXXXXXX"
 * form. Accepts 01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX (spaces, dashes
 * and parentheses ignored). Returns null when the input cannot be a valid
 * BD mobile number. The visits API compares against stored "+880…" values,
 * so the client MUST send the canonical form.
 */
export function normalizeBdPhoneLocal(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+880")) national = "0" + digits.slice(4);
  else if (digits.startsWith("880")) national = "0" + digits.slice(3);
  else if (digits.startsWith("0")) national = digits;
  else national = "0" + digits;
  if (!/^01[3-9]\d{8}$/.test(national)) return null;
  return "+880" + national.slice(1);
}

/** Minutes-from-midnight → "H:MM AM/PM" label (e.g. 1020 → "5:00 PM"). */
export function minuteLabel(minute: number): string {
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "17:00"-style 24h label (e.g. 1020 → "17:00"). */
export function minuteHHMM(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** Sort appointments by slot start ascending (queue order). */
export function bySlotAsc(a: AppointmentDto, b: AppointmentDto): number {
  return a.slotStart.localeCompare(b.slotStart);
}

/** Sort appointments by slot start descending (newest first). */
export function bySlotDesc(a: AppointmentDto, b: AppointmentDto): number {
  return b.slotStart.localeCompare(a.slotStart);
}

/** "6 months" / "75 days" / "15 days" validity label. */
export function validityLabel(value: number, unit: "DAYS" | "MONTHS"): string {
  return `${value} ${unit === "DAYS" ? (value === 1 ? "day" : "days") : value === 1 ? "month" : "months"}`;
}

/** Gender display ("MALE" → "Male", null → "—"). */
export function genderLabel(g: string | null): string {
  if (!g) return "—";
  return g.charAt(0) + g.slice(1).toLowerCase();
}

/** Dhaka-local YYYY-MM for an ISO timestamp (UTC+6, no DST). */
export function dhakaMonthKey(iso: string): string {
  return new Date(Date.parse(iso) + 6 * 3600_000).toISOString().slice(0, 7);
}

/** Status filter groups for the appointments manager. */
export const APPOINTMENT_FILTERS: {
  key: string;
  label: string;
  statuses: string[] | null;
}[] = [
  { key: "all", label: "All", statuses: null },
  { key: "pending", label: "Pending approval", statuses: ["PENDING_APPROVAL"] },
  { key: "confirmed", label: "Confirmed", statuses: ["CONFIRMED"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "cancelled", label: "Cancelled", statuses: ["CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR"] },
  { key: "no_show", label: "No-show", statuses: ["NO_SHOW"] },
  { key: "rejected", label: "Rejected", statuses: ["REJECTED"] },
];

/** Time-of-day bucket for queue grouping. */
export function timeBucket(iso: string): "Morning" | "Afternoon" | "Evening" {
  const hour = Number(
    new Date(Date.parse(iso) + 6 * 3600_000).toISOString().slice(11, 13)
  );
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
