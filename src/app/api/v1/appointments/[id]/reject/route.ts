import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { invalidateMemoryCache } from "@/lib/cache";
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

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "A rejection reason of at least 3 characters is required.")
    .max(300, "Rejection reason must be at most 300 characters."),
});

/**
 * POST /api/v1/appointments/[id]/reject — doctor owner only.
 * Moves a PENDING_APPROVAL request to REJECTED with doctorNote = reason.
 */
export async function POST(
  req: NextRequest,
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
      return fail("Only doctors can reject appointments.", 403, "FORBIDDEN");
    }

    const raw: unknown = await req.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return fail("Invalid JSON body.", 400, "INVALID_BODY");
    }
    const parsed = rejectSchema.safeParse(raw);
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
    if (appointment.status !== APPOINTMENT_STATUS.PENDING_APPROVAL) {
      return fail(
        "Only pending approval requests can be rejected.",
        400,
        "INVALID_STATUS"
      );
    }

    // CONDITIONAL TRANSITION + SLOT RELEASE: rejecting frees the (doctorId,
    // slotKey) occupancy so the slot becomes bookable again (the store
    // derives the release from the REJECTED target status).
    const updated = await getStore().updateAppointment(
      id,
      {
        status: APPOINTMENT_STATUS.REJECTED,
        doctorNote: parsed.data.reason,
      },
      { requireStatuses: [APPOINTMENT_STATUS.PENDING_APPROVAL] }
    );

    await logAppointmentAction("APPOINTMENT_REJECTED", updated.id, user.id, {
      reason: parsed.data.reason,
    });

    // Privacy: the notification never contains the rejection reason — the
    // patient reads it in the appointment detail instead.
    await notifyUser(
      updated.patientId,
      NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
      "Appointment rejected",
      `${doctorDisplayName(updated.doctor.name)} could not accept your appointment (${updated.referenceCode}).`,
      {
        appointmentId: updated.id,
        referenceCode: updated.referenceCode,
        doctorSlug: updated.doctor.slug,
      }
    );

    // Rejected — the slot is freed, derived slot caches must go (parity
    // with the cancel route).
    invalidateMemoryCache("v1:slots");
    invalidateMemoryCache("v1:doctors");

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
