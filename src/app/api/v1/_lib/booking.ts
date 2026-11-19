import { z } from "zod";
import { getStore } from "@/lib/data";
import type { AppointmentRecord } from "@/lib/data/types";
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

export { normalizePhone } from "@/lib/phone";

/** Map a store appointment record (with the doctor join) to the client DTO. */
export function toAppointmentDto(row: AppointmentRecord): AppointmentDto {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: row.status as AppointmentStatus,
    type: row.type as AppointmentType,
    bookingMode: row.bookingMode as BookingMode,
    fee: row.fee,
    currency: row.currency,
    slotStart: row.slotStart,
    slotEnd: row.slotEnd,
    patientName: row.patientName,
    patientPhone: row.patientPhone,
    patientAge: row.patientAge,
    patientGender: row.patientGender,
    notes: row.notes,
    doctorNote: row.doctorNote,
    createdAt: row.createdAt,
    doctor: {
      slug: row.doctor.slug,
      name: row.doctor.name,
      city: row.doctor.city,
      consultationFee: row.doctor.consultationFee,
      specialties: row.doctor.specialties,
    },
    patientId: row.patientId,
  };
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
    await getStore().createAuditLog({
      action,
      entity: "Appointment",
      entityId: appointmentId,
      actorId,
      meta: JSON.stringify(meta),
    });
  } catch (err) {
    console.error("[medbriq-audit]", action, err);
  }
}
