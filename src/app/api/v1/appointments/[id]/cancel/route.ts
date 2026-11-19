import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { APPOINTMENT_STATUS, ROLES } from "@/lib/constants";
import {
  logAppointmentAction,
  normalizePhone,
  toAppointmentDto,
} from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

const cancelSchema = z.object({
  reason: z.string().trim().max(300, "Reason must be at most 300 characters.").optional(),
  phone: z.string().trim().min(1).optional(),
  referenceCode: z.string().trim().min(1).optional(),
});

/**
 * POST /api/v1/appointments/[id]/cancel
 *
 * Permission:
 *  (a) signed-in patient owner            -> CANCELLED_BY_PATIENT
 *  (b) signed-in doctor of the appointment-> CANCELLED_BY_DOCTOR (doctorNote = reason)
 *  (c) guest with matching phone + code   -> CANCELLED_BY_PATIENT
 * Anything else is 401/403. Only PENDING_APPROVAL/CONFIRMED appointments with
 * a future slot start can be cancelled.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const raw: unknown = await req.json().catch(() => ({}));
    const parsed = cancelSchema.safeParse(
      typeof raw === "object" && raw !== null ? raw : {}
    );
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    const appointment = await getStore().getAppointmentById(id);
    if (!appointment) {
      return fail("Appointment not found.", 404, "NOT_FOUND");
    }

    const user = await getCurrentUser();
    let actor: "PATIENT" | "DOCTOR" | "GUEST" | null = null;

    if (user) {
      if (appointment.patientId === user.id) {
        actor = "PATIENT";
      } else if (user.role === ROLES.DOCTOR) {
        // doctor.userId is resolved via the appointment record's doctor join —
        // the signed-in doctor owns the appointment only if it is their profile.
        if (appointment.doctor.userId === user.id) actor = "DOCTOR";
      }
    } else if (input.phone && input.referenceCode) {
      const phoneMatches =
        normalizePhone(input.phone) === normalizePhone(appointment.patientPhone);
      const codeMatches =
        input.referenceCode.toUpperCase() ===
        appointment.referenceCode.toUpperCase();
      if (phoneMatches && codeMatches) actor = "GUEST";
    }

    if (!actor) {
      return user
        ? fail(
            "You are not allowed to cancel this appointment.",
            403,
            "FORBIDDEN"
          )
        : fail(
            "Sign in, or provide the phone number and reference code used for this appointment.",
            401,
            "UNAUTHENTICATED"
          );
    }

    const activeStatuses = [
      APPOINTMENT_STATUS.PENDING_APPROVAL,
      APPOINTMENT_STATUS.CONFIRMED,
    ];
    if (
      !activeStatuses.includes(
        appointment.status as (typeof activeStatuses)[number]
      ) ||
      new Date(appointment.slotStart).getTime() <= Date.now()
    ) {
      return fail(
        "This appointment can no longer be cancelled.",
        400,
        "NOT_CANCELLABLE"
      );
    }

    const cancelledByDoctor = actor === "DOCTOR";
    const updated = await getStore().updateAppointment(id, {
      status: cancelledByDoctor
        ? APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR
        : APPOINTMENT_STATUS.CANCELLED_BY_PATIENT,
      ...(cancelledByDoctor && input.reason ? { doctorNote: input.reason } : {}),
    });

    await logAppointmentAction(
      "APPOINTMENT_CANCELLED",
      updated.id,
      user?.id ?? null,
      {
        cancelledBy: actor,
        fromStatus: appointment.status,
        ...(input.reason ? { reason: input.reason } : {}),
      }
    );

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
