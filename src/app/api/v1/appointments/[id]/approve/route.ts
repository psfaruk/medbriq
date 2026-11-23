import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { requireModule } from "@/lib/modules";
import { APPOINTMENT_STATUS, NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import {
  doctorDisplayName,
  logAppointmentAction,
  notifyUser,
  toAppointmentDto,
} from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/appointments/[id]/approve — doctor owner only.
 * Moves a PENDING_APPROVAL request to CONFIRMED.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Residency gate (docs/ARCHITECTURE_CORRECTIONS.md #5): every booking
    // transition write is part of the appointmentBooking module surface.
    requireModule("appointmentBooking");

    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to manage appointments.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can approve appointments.", 403, "FORBIDDEN");
    }

    const appointment = await getStore().getAppointmentById(id);
    if (!appointment) {
      return fail("Appointment not found.", 404, "NOT_FOUND");
    }
    if (appointment.doctor.userId !== user.id) {
      return fail("You can only manage your own appointments.", 403, "FORBIDDEN");
    }
    if (appointment.status !== APPOINTMENT_STATUS.PENDING_APPROVAL) {
      return fail(
        "Only pending approval requests can be approved.",
        400,
        "INVALID_STATUS"
      );
    }
    // Never approve a request whose slot has already passed — the EXPIRED
    // sweep may not have run yet, but a past slot must not become CONFIRMED.
    if (new Date(appointment.slotStart).getTime() <= Date.now()) {
      return fail(
        "This appointment's time slot has already passed.",
        400,
        "SLOT_PAST"
      );
    }

    // CONDITIONAL TRANSITION: the write only applies while the row is still
    // PENDING_APPROVAL — a concurrent cancel/reject surfaces as 409
    // STATUS_CHANGED instead of silently overwriting the other outcome.
    const updated = await getStore().updateAppointment(
      id,
      { status: APPOINTMENT_STATUS.CONFIRMED },
      { requireStatuses: [APPOINTMENT_STATUS.PENDING_APPROVAL] }
    );

    await logAppointmentAction("APPOINTMENT_APPROVED", updated.id, user.id, {
      fromStatus: appointment.status,
      toStatus: updated.status,
    });

    await notifyUser(
      updated.patientId,
      NOTIFICATION_TYPES.APPOINTMENT_APPROVED,
      "Appointment approved",
      `${doctorDisplayName(updated.doctor.name)} approved your appointment (${updated.referenceCode}).`,
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
