import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { invalidateMemoryCache } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { getStore, SlotConflictError } from "@/lib/data";
import { requireModule } from "@/lib/modules";
import type { AppointmentRecord } from "@/lib/data/types";
import { APPOINTMENT_STATUS, NOTIFICATION_TYPES } from "@/lib/constants";
import { validateBookableSlot } from "@/lib/slots";
import {
  canonicalPhone,
  dateStrSchema,
  doctorDisplayName,
  logAppointmentAction,
  notifyUser,
  slotDateLabel,
  toAppointmentDto,
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
 * is re-validated server-side and the move happens atomically in the store;
 * the (doctorId, slotStart) uniqueness guard is again the authoritative
 * check — a concurrent taker of the new slot surfaces as 409 SLOT_TAKEN.
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

    const store = getStore();
    const appointment = await store.getAppointmentById(id);
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
        canonicalPhone(input.phone) ===
          canonicalPhone(appointment.patientPhone) &&
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

    // ── Past-slot guard (parity with cancel) ──
    // An appointment whose CURRENT slot already started/ended must not be
    // movable — rescheduling it to next week would bypass the cancel cutoff
    // and the no-show flow entirely.
    if (new Date(appointment.slotStart).getTime() <= Date.now()) {
      return fail(
        "This appointment's slot has already passed — it can no longer be rescheduled.",
        400,
        "NOT_RESCHEDULABLE"
      );
    }

    const newSlotStart = new Date(input.newSlotStartIso);
    if (Number.isNaN(newSlotStart.getTime())) {
      return fail("Invalid new slot.", 400, "VALIDATION_ERROR");
    }
    if (newSlotStart.getTime() === new Date(appointment.slotStart).getTime()) {
      return fail(
        "This appointment is already booked for that slot.",
        400,
        "SAME_SLOT"
      );
    }

    // Validate the new slot within the appointment's OWN chamber so a
    // chamber-A appointment cannot be moved into chamber-B-only minutes
    // (the appointment keeps its chamber; the offered slots must match it).
    const slot = await validateBookableSlot(
      appointment.doctorId,
      input.newDate,
      input.newSlotStartIso,
      appointment.chamberId ?? null
    );
    if (!slot) {
      return fail(
        "Selected slot is no longer available.",
        400,
        "SLOT_UNAVAILABLE"
      );
    }

    let updated: AppointmentRecord;
    try {
      updated = await store.rescheduleAppointment(
        id,
        slot.startIso,
        slot.endIso,
        // Approval-mode doctors must re-approve a moved appointment.
        appointment.doctor.requiresApproval
      );
    } catch (err) {
      if (err instanceof SlotConflictError) {
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
        oldSlotStart: appointment.slotStart,
        oldSlotEnd: appointment.slotEnd,
        newSlotStart: updated.slotStart,
        newSlotEnd: updated.slotEnd,
        ...(appointment.doctor.requiresApproval
          ? { statusResetTo: APPOINTMENT_STATUS.PENDING_APPROVAL }
          : {}),
      }
    );

    // Notify both sides about the new date (Dhaka calendar date of the slot
    // — a UTC slice would read one day early for slots before 06:00).
    const newDateLabel = slotDateLabel(updated.slotStart);
    const rescheduleMeta = {
      appointmentId: updated.id,
      referenceCode: updated.referenceCode,
      doctorSlug: updated.doctor.slug,
    };
    await notifyUser(
      updated.doctor.userId,
      NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
      "Appointment rescheduled",
      `${updated.patientName} rescheduled their appointment to ${newDateLabel} (${updated.referenceCode}).`,
      rescheduleMeta
    );
    await notifyUser(
      updated.patientId,
      NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
      "Appointment rescheduled",
      `Your appointment with ${doctorDisplayName(updated.doctor.name)} was rescheduled to ${newDateLabel} (${updated.referenceCode}).`,
      rescheduleMeta
    );

    invalidateMemoryCache("v1:slots");
    invalidateMemoryCache("v1:doctors");

    return ok({ appointment: toAppointmentDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
