import type { NextRequest } from "next/server";
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

/**
 * POST /api/v1/appointments/[id]/no-show — doctor owner only.
 *
 * Marks a CONFIRMED appointment NO_SHOW: the patient did not attend. This
 * writes the separated status axes (booking status NO_SHOW, consultation
 * status NOT_HELD — docs/ARCHITECTURE_CORRECTIONS.md #12) and records NO
 * visit-history row, so a no-show never establishes returning-patient
 * eligibility (docs/FEE_SYSTEM.md §2.2).
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
      return fail("Only doctors can mark no-shows.", 403, "FORBIDDEN");
    }

    const store = getStore();
    const appointment = await store.getAppointmentById(id);
    if (!appointment) {
      return fail("Appointment not found.", 404, "NOT_FOUND");
    }
    if (appointment.doctor.userId !== user.id) {
      return fail("You can only manage your own appointments.", 403, "FORBIDDEN");
    }
    if (appointment.status !== APPOINTMENT_STATUS.CONFIRMED) {
      return fail(
        "Only confirmed appointments can be marked as no-show.",
        400,
        "INVALID_STATUS"
      );
    }
    // A no-show can only be recorded once the consultation time arrived —
    // marking a future slot as no-show would block it for no reason.
    if (new Date(appointment.slotStart).getTime() > Date.now()) {
      return fail(
        "This appointment's time slot has not started yet.",
        400,
        "SLOT_NOT_PAST"
      );
    }

    // CONDITIONAL TRANSITION: only applies while still CONFIRMED — a
    // concurrent complete/cancel surfaces as 409 STATUS_CHANGED.
    const updated = await store.updateAppointment(
      id,
      {
        status: APPOINTMENT_STATUS.NO_SHOW,
        consultationStatus: "NOT_HELD",
      },
      { requireStatuses: [APPOINTMENT_STATUS.CONFIRMED] }
    );

    await logAppointmentAction("APPOINTMENT_NO_SHOW", updated.id, user.id, {
      fromStatus: appointment.status,
      toStatus: updated.status,
      // Explicitly no visit-history row is written for a no-show.
      eligibilityImpact: "NONE",
    });

    await notifyUser(
      updated.patientId,
      NOTIFICATION_TYPES.APPOINTMENT_NO_SHOW,
      "Missed appointment",
      `You missed your appointment with ${doctorDisplayName(updated.doctor.name)} (${updated.referenceCode}). Please book again when needed.`,
      {
        appointmentId: updated.id,
        referenceCode: updated.referenceCode,
        doctorSlug: updated.doctor.slug,
      }
    );

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
