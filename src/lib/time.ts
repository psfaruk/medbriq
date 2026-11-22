/**
 * Find Medi Doctor time utilities.
 *
 * Policy (docs/architecture.md):
 * - All appointment timestamps are stored in UTC.
 * - The initial market timezone is Asia/Dhaka (UTC+6). Bangladesh has had no
 *   daylight saving time since 2009, so the offset is fixed. If the platform
 *   expands to DST-observing countries, slot generation must move to a
 *   timezone library (documented limitation of the MVP).
 */

export const DHAKA_OFFSET_MINUTES = 6 * 60; // UTC+6

/**
 * Convert a Dhaka-local date + minute-of-day to a UTC Date.
 * @param dateStr "YYYY-MM-DD" in Asia/Dhaka
 * @param minuteOfDay minutes from local midnight (e.g. 540 = 09:00)
 */
export function dhakaToUtc(dateStr: string, minuteOfDay: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d, 0, minuteOfDay - DHAKA_OFFSET_MINUTES, 0, 0);
  return new Date(utcMs);
}

/** Get the Dhaka-local "YYYY-MM-DD" for a given instant. */
export function dhakaDateString(instant: Date = new Date()): string {
  const shifted = new Date(instant.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Get the Dhaka-local day-of-week (0 = Sunday ... 6 = Saturday). */
export function dhakaDayOfWeek(dateStr: string): number {
  // Parse the date string directly — do NOT round-trip through dhakaToUtc,
  // whose UTC instant (previous day 18:00Z) would yield the wrong weekday.
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Add days to a "YYYY-MM-DD" string, returning "YYYY-MM-DD". */
export function addDays(dateStr: string, days: number): string {
  const d = dhakaToUtc(dateStr, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return dhakaDateString(d);
}

/** Format minutes-of-day as "h:mm AM/PM" (12h, en-US style). */
export function minutesToLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Format a UTC instant as a Dhaka-local human label, e.g. "Sat, 14 Feb · 5:30 PM". */
export function formatDhaka(instant: Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(instant);
}

/** "YYYY-MM-DD" -> "Sat, 14 Feb" */
export function formatDateLabel(dateStr: string): string {
  return formatDhaka(dhakaToUtc(dateStr, 0), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
