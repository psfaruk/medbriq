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
 * POST /api/v1/appointments/[id]/approve — doctor owner only.
 * Moves a PENDING_APPROVAL request to CONFIRMED.
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

    const updated = await getStore().updateAppointment(id, {
      status: APPOINTMENT_STATUS.CONFIRMED,
    });

    await logAppointmentAction("APPOINTMENT_APPROVED", updated.id, user.id, {
      fromStatus: appointment.status,
      toStatus: updated.status,
    });

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
