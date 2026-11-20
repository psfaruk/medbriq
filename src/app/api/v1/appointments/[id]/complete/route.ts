import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { APPOINTMENT_STATUS, NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import { requireModule } from "@/lib/modules";
import {
  doctorDisplayName,
  logAppointmentAction,
  notifyUser,
  toAppointmentDto,
} from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

const completeSchema = z.object({
  consultationNote: z
    .string()
    .trim()
    .max(
      2000,
      "Consultation note must be at most 2000 characters."
    )
    .nullable()
    .optional(),
});

/**
 * POST /api/v1/appointments/[id]/complete — doctor owner only.
 * Marks a CONFIRMED appointment COMPLETED once its slot has fully passed,
 * and — in the SAME transaction — records the doctor_patient_history visit
 * row that establishes/renews returning-patient eligibility
 * (docs/FEE_SYSTEM.md §2.2). Only completed consultations with settled
 * payment (NOT_REQUIRED or PAID) qualify; the flag is snapshotted onto the
 * visit row so later payment changes never rewrite history.
 * An optional consultationNote (≤ 2000 chars) may be recorded with the visit.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireModule("appointmentBooking");

    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to manage appointments.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can complete appointments.", 403, "FORBIDDEN");
    }

    const raw: unknown = await req.json().catch(() => ({}));
    const parsed = completeSchema.safeParse(
      typeof raw === "object" && raw !== null ? raw : {}
    );
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const appointment = await getStore().getAppointmentById(id);
    if (!appointment) {
      return fail("Appointment not found.", 404, "NOT_FOUND");
    }
    if (appointment.doctor.userId !== user.id) {
      return fail("You can only manage your own appointments.", 403, "FORBIDDEN");
    }
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      return fail(
        "Only confirmed appointments can be marked completed.",
        400,
        "INVALID_STATUS"
      );
    }
    if (new Date(appointment.slotEnd).getTime() > Date.now()) {
      return fail(
        "Consultation time has not ended yet.",
        400,
        "NOT_ENDED"
      );
    }

    const consultationNote =
      parsed.data.consultationNote && parsed.data.consultationNote.length > 0
        ? parsed.data.consultationNote
        : null;

    const updated = await getStore().completeAppointmentWithVisit(id, {
      consultationNote,
    });

    await logAppointmentAction("APPOINTMENT_COMPLETED", updated.id, user.id, {
      fromStatus: appointment.status,
      toStatus: updated.status,
      patientType: updated.patientType,
      fee: updated.fee,
      qualifyingVisitRecorded:
        updated.paymentStatus === "NOT_REQUIRED" ||
        updated.paymentStatus === "PAID",
      ...(consultationNote !== null
        ? { consultationNoteIncluded: true }
        : {}),
    });

    // No medical info in the notification body — the note stays private.
    await notifyUser(
      updated.patientId,
      NOTIFICATION_TYPES.APPOINTMENT_COMPLETED,
      "Appointment completed",
      `Your consultation with ${doctorDisplayName(updated.doctor.name)} is complete (${updated.referenceCode}). You can now rate your visit.`,
      {
        appointmentId: updated.id,
        referenceCode: updated.referenceCode,
        doctorSlug: updated.doctor.slug,
      }
    );

    return ok({
      // The submitted note is echoed explicitly (the store record does not
      // carry it back yet on all stores — see toAppointmentDto).
      appointment: { ...toAppointmentDto(updated), consultationNote },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
