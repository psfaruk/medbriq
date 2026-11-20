import { getStore } from "@/lib/data";
import { DEFAULT_SLOT_MINUTES } from "@/lib/constants";
import {
  dhakaToUtc,
  dhakaDayOfWeek,
  minutesToLabel,
} from "@/lib/time";

/**
 * Medbriq slot engine.
 *
 * Slots are derived from the doctor's weekly availability rules for a
 * given Dhaka-local date, minus slots already taken by blocking appointment
 * statuses. Computation is pure; concurrency safety is enforced by the
 * (doctorId, slotStart) uniqueness guard at write time — the SQLite unique
 * index in Prisma mode, the appointments/{doctorId}_{slotStart} doc id in
 * Firestore mode.
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
const BLOCKING_STATUSES = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW", // the slot was consumed even though the patient did not attend
];

export async function getSlotsForDate(
  doctorId: string,
  dateStr: string
): Promise<SlotInfo[]> {
  const store = getStore();
  const rules = await store.findActiveRulesForDay(
    doctorId,
    dhakaDayOfWeek(dateStr)
  );
  if (rules.length === 0) return [];

  const dayStartUtc = dhakaToUtc(dateStr, 0);
  const dayEndUtc = dhakaToUtc(dateStr, 24 * 60);

  const booked = await store.findBlockingSlotStarts(
    doctorId,
    dayStartUtc.toISOString(),
    dayEndUtc.toISOString(),
    BLOCKING_STATUSES
  );
  const takenSet = new Set(booked);

  const now = Date.now();
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
        past: start.getTime() <= now,
      });
    }
  }

  return slots.sort((a, b) => a.startMinute - b.startMinute);
}

/** Validate that a submitted slotIso matches a real, bookable slot. */
export async function validateBookableSlot(
  doctorId: string,
  dateStr: string,
  slotIso: string
): Promise<SlotInfo | null> {
  const slots = await getSlotsForDate(doctorId, dateStr);
  return slots.find(
    (s) => s.startIso === slotIso && !s.taken && !s.past
  ) ?? null;
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
