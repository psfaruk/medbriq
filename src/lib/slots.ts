import { getStore } from "@/lib/data";
import { DEFAULT_SLOT_MINUTES } from "@/lib/constants";
import {
  dhakaToUtc,
  dhakaDayOfWeek,
  minutesToLabel,
} from "@/lib/time";

/**
 * Find Medi Doctor slot engine.
 *
 * Slots are derived from the doctor's weekly availability rules for a
 * given Dhaka-local date, minus slots already taken by blocking appointment
 * statuses. Computation is pure; concurrency safety is enforced by the
 * (doctorId, slotKey) occupancy guard at write time — the SQLite unique
 * index in Prisma mode (slotKey = slotStart while occupied, NULL when
 * cancelled/rejected/expired), the appointments/{doctorId}_{slotStart} doc
 * id in Firestore mode.
 */

export type SlotInfo = {
  /** ISO UTC start instant */
  startIso: string;
  /** ISO UTC end instant */
  endIso: string;
  /** minutes from Dhaka midnight, e.g. 1020 = 5:00 PM */
  startMinute: number;
  /** human label, e.g. "5:00 PM" */
  label: string;
  taken: boolean;
  past: boolean;
};

/** Appointment statuses that occupy a slot. */
export const BLOCKING_STATUSES = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW", // the slot was consumed even though the patient did not attend
];

/** Minimal rule shape the pure slot builder needs. */
export type SlotRule = {
  startMinute: number;
  endMinute: number;
};

/**
 * PURE slot derivation for one Dhaka-local date from pre-loaded rules and a
 * pre-loaded set of taken slotStart ISOs. No store access — this is the
 * shared engine behind both getSlotsForDate (single doctor/day over the
 * wire) and the batched directory "next available" computation (many
 * doctors × 14 days computed in memory from ONE batch of reads).
 */
export function buildSlotsForDate(
  rules: SlotRule[],
  dateStr: string,
  takenSet: ReadonlySet<string>,
  nowMs: number
): SlotInfo[] {
  const slots: SlotInfo[] = [];
  const seen = new Set<number>();

  for (const rule of rules) {
    for (
      let m = rule.startMinute;
      m + DEFAULT_SLOT_MINUTES <= rule.endMinute;
      m += DEFAULT_SLOT_MINUTES
    ) {
      if (seen.has(m)) continue; // overlapping rules should not duplicate slots
      seen.add(m);
      const start = dhakaToUtc(dateStr, m);
      const end = dhakaToUtc(dateStr, m + DEFAULT_SLOT_MINUTES);
      slots.push({
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        startMinute: m,
        label: minutesToLabel(m),
        taken: takenSet.has(start.toISOString()),
        past: start.getTime() <= nowMs,
      });
    }
  }

  return slots.sort((a, b) => a.startMinute - b.startMinute);
}

export async function getSlotsForDate(
  doctorId: string,
  dateStr: string,
  chamberId?: string | null
): Promise<SlotInfo[]> {
  const store = getStore();
  let rules = await store.findActiveRulesForDay(
    doctorId,
    dhakaDayOfWeek(dateStr)
  );
  if (chamberId) {
    // Chamber-specific view: chamber rules + the doctor's general rules
    // (chamberId === null applies at every chamber).
    rules = rules.filter((rule) => !rule.chamberId || rule.chamberId === chamberId);
  }
  if (rules.length === 0) return [];

  const dayStartUtc = dhakaToUtc(dateStr, 0);
  const dayEndUtc = dhakaToUtc(dateStr, 24 * 60);

  const booked = await store.findBlockingSlotStarts(
    doctorId,
    dayStartUtc.toISOString(),
    dayEndUtc.toISOString(),
    BLOCKING_STATUSES
  );

  return buildSlotsForDate(rules, dateStr, new Set(booked), Date.now());
}

/** Validate that a submitted slotIso matches a real, bookable slot. */
export async function validateBookableSlot(
  doctorId: string,
  dateStr: string,
  slotIso: string,
  chamberId?: string | null
): Promise<SlotInfo | null> {
  const slots = await getSlotsForDate(doctorId, dateStr, chamberId);
  // Compare as INSTANTS, not raw strings: equivalent ISO spellings of the
  // same slot (…Z vs …000Z vs +00:00) must not read as a different slot.
  // A malformed slotIso (NaN) matches nothing, exactly as intended.
  const instant = new Date(slotIso).getTime();
  return (
    slots.find(
      (s) =>
        Number.isFinite(instant) &&
        new Date(s.startIso).getTime() === instant &&
        !s.taken &&
        !s.past
    ) ?? null
  );
}

/** Generate a guest-friendly reference code, e.g. "MB-7K2P9Q". */
export function generateReferenceCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MB-${code}`;
}
