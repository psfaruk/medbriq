import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { APPOINTMENT_STATUS } from "@/lib/constants";
import { validateBookableSlot } from "@/lib/slots";
import {
  appointmentInclude,
  dateStrSchema,
  isSlotTakenError,
  logAppointmentAction,
  normalizePhone,
  toAppointmentDto,
  type AppointmentWithDoctor,
} from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

const rescheduleSchema = z.object({
  newDate: dateStrSchema,
  newSlotStartIso: z.string().min(1, "A new time slot is required."),
  phone: z.string().trim().min(1).optional(),
  referenceCode: z.string().trim().min(1).optional(),
});

/**
 * POST /api/v1/appointments/[id]/reschedule
 *
 * Patient-side action: permission mirrors patient-side cancel (signed-in
 * patient owner, or guest with matching phone + referenceCode). The new slot
 * is re-validated server-side and the move happens in a transaction; the
 * (doctorId, slotStart) unique constraint is again the authoritative guard —
 * a concurrent taker of the new slot surfaces as 409 SLOT_TAKEN.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const raw: unknown = await req.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return fail("Invalid JSON body.", 400, "INVALID_BODY");
    }
    const parsed = rescheduleSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid reschedule request.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      return fail("Appointment not found.", 404, "NOT_FOUND");
    }

    // --- permission (patient owner or guest with phone + code) ---
    const user = await getCurrentUser();
    let authorized = false;
    if (user) {
      authorized = appointment.patientId === user.id;
    } else if (input.phone && input.referenceCode) {
      authorized =
        normalizePhone(input.phone) === normalizePhone(appointment.patientPhone) &&
        input.referenceCode.toUpperCase() ===
          appointment.referenceCode.toUpperCase();
    }
    if (!authorized) {
      return user
        ? fail(
            "You are not allowed to reschedule this appointment.",
            403,
            "FORBIDDEN"
          )
        : fail(
            "Sign in, or provide the phone number and reference code used for this appointment.",
            401,
            "UNAUTHENTICATED"
          );
    }

    const allowedStatuses = [
      APPOINTMENT_STATUS.PENDING_APPROVAL,
      APPOINTMENT_STATUS.CONFIRMED,
    ];
    if (
      !allowedStatuses.includes(
        appointment.status as (typeof allowedStatuses)[number]
      )
    ) {
      return fail(
        "This appointment can no longer be rescheduled.",
        400,
        "NOT_RESCHEDULABLE"
      );
    }

    const newSlotStart = new Date(input.newSlotStartIso);
    if (Number.isNaN(newSlotStart.getTime())) {
      return fail("Invalid new slot.", 400, "VALIDATION_ERROR");
    }
    if (newSlotStart.getTime() === appointment.slotStart.getTime()) {
      return fail(
        "This appointment is already booked for that slot.",
        400,
        "SAME_SLOT"
      );
    }

    const slot = await validateBookableSlot(
      appointment.doctorId,
      input.newDate,
      input.newSlotStartIso
    );
    if (!slot) {
      return fail(
        "Selected slot is no longer available.",
        400,
        "SLOT_UNAVAILABLE"
      );
    }

    let updated: AppointmentWithDoctor;
    try {
      updated = await db.$transaction(async (tx) => {
        return tx.appointment.update({
          where: { id: appointment.id },
          data: {
            slotStart: new Date(slot.startIso),
            slotEnd: new Date(slot.endIso),
            // Approval-mode doctors must re-approve a moved appointment.
            ...(appointment.doctor.requiresApproval
              ? { status: APPOINTMENT_STATUS.PENDING_APPROVAL }
              : {}),
          },
          include: appointmentInclude,
        });
      });
    } catch (err) {
      if (isSlotTakenError(err)) {
        return fail(
          "This slot was just booked by someone else. Please choose another slot.",
          409,
          "SLOT_TAKEN"
        );
      }
      throw err;
    }

    await logAppointmentAction(
      "APPOINTMENT_RESCHEDULED",
      updated.id,
      user?.id ?? null,
      {
        oldSlotStart: appointment.slotStart.toISOString(),
        oldSlotEnd: appointment.slotEnd.toISOString(),
        newSlotStart: updated.slotStart.toISOString(),
        newSlotEnd: updated.slotEnd.toISOString(),
        ...(appointment.doctor.requiresApproval
          ? { statusResetTo: APPOINTMENT_STATUS.PENDING_APPROVAL }
          : {}),
      }
    );

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
