/**
 * Validity arithmetic for the doctor-wise fee system (docs/FEE_SYSTEM.md §2.3).
 *
 * All calendar math happens on Asia/Dhaka local dates (UTC+6, fixed offset —
 * Bangladesh observes no DST). Timestamps are stored/transported as UTC ISO
 * strings and converted at the boundary.
 *
 * NORMATIVE BOUNDARY DEFINITION (pinned by scripts/verify-fee-system.ts):
 *
 *   anchorDate  = dhaka date of the latest qualifying visit's completedAt
 *   expiryDate  = addDays(anchor, N)               when unit = DAYS
 *               = addMonthsClamped(anchor, N)      when unit = MONTHS
 *   eligible()  = dhakaDate(now) <= expiryDate     // expiry date is the LAST
 *                                                  // eligible day, inclusive
 *
 * So "6-month validity, visit 12 Feb" is returning THROUGH 12 Aug (inclusive),
 * and "7-day validity, visit Monday" is returning THROUGH next Monday. Month
 * ends clamp (31 Jan + 1 month → 28/29 Feb) and the clamped date is the last
 * eligible day, so short months never steal a day from the patient.
 */

/** Bangladesh local timezone. */
export const DHAKA_TZ = "Asia/Dhaka";
/** Fixed UTC+6 offset in ms (no DST in Bangladesh). */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** A calendar date in Asia/Dhaka. m is 1-12, d is 1-31. */
export type LocalDate = { y: number; m: number; d: number };

/** Convert a UTC instant (ISO string or Date) to the Dhaka calendar date. */
export function toDhakaLocalDate(iso: string | Date): LocalDate {
  const t =
    (typeof iso === "string" ? new Date(iso).getTime() : iso.getTime()) +
    DHAKA_OFFSET_MS;
  if (!Number.isFinite(t)) {
    throw new Error(`Invalid timestamp: ${String(iso)}`);
  }
  const dt = new Date(t);
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

/** Midnight in Dhaka of the given local date, as a UTC Date. */
export function dhakaMidnightUtc(ld: LocalDate): Date {
  return new Date(Date.UTC(ld.y, ld.m - 1, ld.d) - DHAKA_OFFSET_MS);
}

/** "YYYY-MM-DD" form of a local date (lexicographically sortable). */
export function localDateKey(ld: LocalDate): string {
  return `${ld.y.toString().padStart(4, "0")}-${ld.m
    .toString()
    .padStart(2, "0")}-${ld.d.toString().padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" into a LocalDate (throws when malformed/not real). */
export function parseLocalDateKey(key: string): LocalDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  const ld = {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
  if (ld.m < 1 || ld.m > 12 || ld.d < 1 || ld.d > daysInMonth(ld.y, ld.m)) {
    throw new Error(`Not a real calendar date: ${key}`);
  }
  return ld;
}

/** Compare two local dates: negative when a < b, 0 when equal. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

/** Add exactly n calendar days (n may be negative). */
export function addDays(ld: LocalDate, n: number): LocalDate {
  const dt = new Date(Date.UTC(ld.y, ld.m - 1, ld.d + n));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

/** Number of days in a month (1-12). */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Add n calendar months with day-of-month clamping:
 * 31 Jan + 1 month → 28/29 Feb; 30 Jan + 1 month → 28/29 Feb;
 * 31 Mar + 1 month → 30 Apr.
 */
export function addMonthsClamped(ld: LocalDate, n: number): LocalDate {
  const totalMonths = ld.m - 1 + n;
  const y = ld.y + Math.floor(totalMonths / 12);
  const m = (((totalMonths % 12) + 12) % 12) + 1;
  const d = Math.min(ld.d, daysInMonth(y, m));
  return { y, m, d };
}

/**
 * The last eligible day (inclusive) for a validity window starting at anchor.
 * See the module doc comment for the normative boundary definition.
 */
export function computeExpiryDate(
  anchor: LocalDate,
  value: number,
  unit: "DAYS" | "MONTHS"
): LocalDate {
  return unit === "DAYS"
    ? addDays(anchor, value)
    : addMonthsClamped(anchor, value);
}

/** Whether an evaluation instant is still inside the validity window. */
export function isWithinValidity(
  evaluatedAt: string | Date,
  anchor: LocalDate,
  value: number,
  unit: "DAYS" | "MONTHS"
): boolean {
  const expiry = computeExpiryDate(anchor, value, unit);
  return compareLocalDates(toDhakaLocalDate(evaluatedAt), expiry) <= 0;
}
