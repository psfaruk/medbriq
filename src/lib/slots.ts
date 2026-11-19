import { db } from "@/lib/db";
import { DEFAULT_SLOT_MINUTES } from "@/lib/constants";
import {
  dhakaToUtc,
  dhakaDayOfWeek,
  minutesToLabel,
} from "@/lib/time";

/**
 * Medbriq slot engine.
 *
 * Slots are derived from the doctor's weekly AvailabilityRule rows for a
 * given Dhaka-local date, minus slots already taken by blocking appointment
 * statuses. Computation is pure; concurrency safety is enforced by the
 * Appointment @@unique([doctorId, slotStart]) constraint at write time.
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
];

export async function getSlotsForDate(
  doctorId: string,
  dateStr: string
): Promise<SlotInfo[]> {
  const rules = await db.availabilityRule.findMany({
    where: { doctorId, isActive: true, dayOfWeek: dhakaDayOfWeek(dateStr) },
    orderBy: { startMinute: "asc" },
  });
  if (rules.length === 0) return [];

  const dayStartUtc = dhakaToUtc(dateStr, 0);
  const dayEndUtc = dhakaToUtc(dateStr, 24 * 60);

  const booked = await db.appointment.findMany({
    where: {
      doctorId,
      slotStart: { gte: dayStartUtc, lt: dayEndUtc },
      status: { in: BLOCKING_STATUSES },
    },
    select: { slotStart: true },
  });
  const takenSet = new Set(booked.map((a) => a.slotStart.toISOString()));

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
