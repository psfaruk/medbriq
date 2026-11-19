import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { APPOINTMENT_STATUS, ROLES } from "@/lib/constants";
import {
  logAppointmentAction,
  toAppointmentDto,
} from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/appointments/[id]/complete — doctor owner only.
 * Marks a CONFIRMED appointment COMPLETED once its slot has fully passed.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to manage appointments.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can complete appointments.", 403, "FORBIDDEN");
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

    const updated = await getStore().updateAppointment(id, {
      status: APPOINTMENT_STATUS.COMPLETED,
    });

    await logAppointmentAction("APPOINTMENT_COMPLETED", updated.id, user.id, {
      fromStatus: appointment.status,
      toStatus: updated.status,
    });

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
