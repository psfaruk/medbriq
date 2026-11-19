import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import type {
  AppointmentStatus,
  AppointmentType,
  BookingMode,
} from "@/lib/constants";
import type { AppointmentDto } from "@/lib/types";

/**
 * Shared server-side helpers for the Medbriq booking engine routes.
 *
 * This folder is prefixed with "_" so Next.js treats it as a private
 * (non-routable) folder — it is only ever imported by /api/v1 route handlers.
 */

/** Strict "YYYY-MM-DD" that must also be a real calendar date. */
export const dateStrSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      Number.isFinite(y) &&
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }, "Date is not a real calendar date.");

/**
 * Normalize a phone number for comparison: strip spaces, dashes and
 * parentheses. Numbers are stored as given; lookups compare both sides
 * normalized (see GET /api/v1/appointments and the cancel/reschedule guards).
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

/**
 * Prisma include resolving everything the AppointmentDto needs, plus the
 * ownership fields used by the permission checks (doctor.userId,
 * doctor.requiresApproval).
 */
export const appointmentInclude = {
  doctor: {
    select: {
      userId: true,
      slug: true,
      city: true,
      consultationFee: true,
      requiresApproval: true,
      user: { select: { name: true } },
      specialties: { select: { specialty: { select: { name: true } } } },
    },
  },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithDoctor = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

/** Map a Prisma appointment row (with the doctor include) to the client DTO. */
export function toAppointmentDto(row: AppointmentWithDoctor): AppointmentDto {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: row.status as AppointmentStatus,
    type: row.type as AppointmentType,
    bookingMode: row.bookingMode as BookingMode,
    fee: row.fee,
    currency: row.currency,
    slotStart: row.slotStart.toISOString(),
    slotEnd: row.slotEnd.toISOString(),
    patientName: row.patientName,
    patientPhone: row.patientPhone,
    patientAge: row.patientAge,
    patientGender: row.patientGender,
    notes: row.notes,
    doctorNote: row.doctorNote,
    createdAt: row.createdAt.toISOString(),
    doctor: {
      slug: row.doctor.slug,
      name: row.doctor.user.name,
      city: row.doctor.city,
      consultationFee: row.doctor.consultationFee,
      specialties: row.doctor.specialties.map((s) => s.specialty.name),
    },
    patientId: row.patientId,
  };
}

/** True when the error is a Prisma P2002 (unique constraint violation). */
export function isP2002(
  err: unknown
): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/**
 * True when a P2002 was raised by the (doctorId, slotStart) unique constraint —
 * i.e. the slot was double-booked concurrently. The DB-level guard is the
 * single source of truth for double-booking; this classifier lets us turn the
 * constraint violation into a friendly 409 instead of a 500.
 *
 * Prisma reports the violating fields via meta.target (normally an array of
 * column names; on some engine versions a constraint name), and the constraint
 * name also appears in the message — both are checked defensively so we never
 * misclassify a slot collision as a referenceCode collision.
 */
export function isSlotTakenError(err: unknown): boolean {
  if (!isP2002(err)) return false;
  const meta = err.meta as { target?: unknown } | undefined;
  const target = meta?.target;
  const parts: string[] = Array.isArray(target)
    ? target.map((t) => String(t))
    : typeof target === "string"
      ? [target]
      : [];
  const haystack = [...parts, err.message].join(" ").toLowerCase();
  return haystack.includes("slotstart");
}

/**
 * Fire-and-forget audit trail. An audit failure must never fail an action
 * that has already been committed, so errors are only logged server-side.
 */
export async function logAppointmentAction(
  action: string,
  appointmentId: string,
  actorId: string | null,
  meta: Record<string, unknown>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        entity: "Appointment",
        entityId: appointmentId,
        actorId,
        meta: JSON.stringify(meta),
      },
    });
  } catch (err) {
    console.error("[medbriq-audit]", action, err);
  }
}
