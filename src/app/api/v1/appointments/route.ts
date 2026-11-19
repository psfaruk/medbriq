import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  APPOINTMENT_STATUS,
  BOOKING_MODE,
  DEFAULT_SLOT_MINUTES,
} from "@/lib/constants";
import {
  generateReferenceCode,
  validateBookableSlot,
} from "@/lib/slots";
import {
  appointmentInclude,
  dateStrSchema,
  isP2002,
  isSlotTakenError,
  logAppointmentAction,
  normalizePhone,
  toAppointmentDto,
  type AppointmentWithDoctor,
} from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  doctorSlug: z.string().trim().min(1, "Doctor is required."),
  date: dateStrSchema,
  slotStartIso: z.string().min(1, "A time slot is required."),
  type: z.enum(["IN_PERSON", "VIDEO"]),
  patientName: z
    .string()
    .trim()
    .min(2, "Patient name must be at least 2 characters.")
    .max(80, "Patient name must be at most 80 characters."),
  patientPhone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9\-() ]{8,20}$/,
      "Enter a valid phone number (8-20 digits; may include +, spaces, dashes and parentheses)."
    ),
  patientAge: z
    .number()
    .int("Age must be a whole number.")
    .min(0, "Age must be between 0 and 120.")
    .max(120, "Age must be between 0 and 120.")
    .optional(),
  patientGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  notes: z.string().trim().max(500, "Notes must be at most 500 characters.").optional(),
});

/**
 * GET /api/v1/appointments
 *
 * (a) Logged in (any role — doctors can book as patients too): the user's own
 *     appointments (patientId === user.id), newest slot first, capped at 100.
 * (b) Guest lookup: ?phone=...&code=... — phone compared normalized on both
 *     sides and referenceCode compared case-insensitively.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (user) {
      const rows = await db.appointment.findMany({
        where: { patientId: user.id },
        orderBy: { slotStart: "desc" },
        take: 100,
        include: appointmentInclude,
      });
      return ok({ items: rows.map(toAppointmentDto) });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim() ?? "";
    const code = searchParams.get("code")?.trim() ?? "";

    if (!phone || !code) {
      return fail(
        "Sign in, or provide both phone and code to look up appointments.",
        401,
        "UNAUTHENTICATED"
      );
    }

    // Guest lookup. referenceCode is unique, so at most one appointment can
    // match; the lightweight scan lets us compare the phone normalized and the
    // code case-insensitively (SQLite has no case-insensitive equality and
    // phones are stored as given). Bounded for safety.
    const normalizedPhone = normalizePhone(phone);
    const codeUpper = code.toUpperCase();
    const candidates = await db.appointment.findMany({
      select: { id: true, referenceCode: true, patientPhone: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    const matchedIds = candidates
      .filter(
        (a) =>
          a.referenceCode.toUpperCase() === codeUpper &&
          normalizePhone(a.patientPhone) === normalizedPhone
      )
      .map((a) => a.id);

    if (matchedIds.length === 0) return ok({ items: [] });

    const rows = await db.appointment.findMany({
      where: { id: { in: matchedIds } },
      orderBy: { slotStart: "desc" },
      take: 100,
      include: appointmentInclude,
    });
    return ok({ items: rows.map(toAppointmentDto) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * POST /api/v1/appointments — create a booking.
 *
 * Correctness notes:
 * - The slot is re-validated server-side (validateBookableSlot) immediately
 *   before the write, but the authoritative double-booking guard is the
 *   Appointment @@unique([doctorId, slotStart]) constraint. If two requests
 *   race, exactly one wins and the loser gets a 409 SLOT_TAKEN.
 * - referenceCode collisions (32^6 space) are retried with fresh codes.
 */
export async function POST(req: NextRequest) {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return fail("Invalid JSON body.", 400, "INVALID_BODY");
    }

    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid booking request.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    const doctor = await db.doctorProfile.findUnique({
      where: { slug: input.doctorSlug },
    });
    if (!doctor || doctor.verificationStatus !== "VERIFIED") {
      return fail("Doctor not available for booking.", 404, "NOT_FOUND");
    }
    if (input.type === "VIDEO" && !doctor.supportsVideo) {
      return fail(
        "This doctor does not offer video consultations.",
        400,
        "VIDEO_UNSUPPORTED"
      );
    }

    const slot = await validateBookableSlot(
      doctor.id,
      input.date,
      input.slotStartIso
    );
    if (!slot) {
      return fail(
        "Selected slot is no longer available.",
        400,
        "SLOT_UNAVAILABLE"
      );
    }

    // Any signed-in user (patient, doctor or admin) can book as a patient.
    const user = await getCurrentUser();

    const bookingMode = doctor.requiresApproval
      ? BOOKING_MODE.APPROVAL
      : BOOKING_MODE.INSTANT;
    const status = doctor.requiresApproval
      ? APPOINTMENT_STATUS.PENDING_APPROVAL
      : APPOINTMENT_STATUS.CONFIRMED;
    const fee =
      input.type === "VIDEO"
        ? doctor.videoConsultFee ?? doctor.consultationFee
        : doctor.consultationFee;
    const slotEnd = new Date(
      new Date(slot.startIso).getTime() + DEFAULT_SLOT_MINUTES * 60_000
    );

    let created: AppointmentWithDoctor | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await db.appointment.create({
          data: {
            referenceCode: generateReferenceCode(),
            doctorId: doctor.id,
            patientId: user?.id ?? null,
            patientName: input.patientName,
            patientPhone: input.patientPhone,
            patientAge: input.patientAge ?? null,
            patientGender: input.patientGender ?? null,
            notes: input.notes && input.notes.length > 0 ? input.notes : null,
            slotStart: new Date(slot.startIso),
            slotEnd,
            type: input.type,
            status,
            bookingMode,
            fee,
            currency: "BDT",
          },
          include: appointmentInclude,
        });
      } catch (err) {
        if (isSlotTakenError(err)) {
          return fail(
            "This slot was just booked by someone else. Please choose another slot.",
            409,
            "SLOT_TAKEN"
          );
        }
        if (!isP2002(err)) throw err;
        // P2002 on referenceCode — astronomically unlikely (32^6 space);
        // retry with a freshly generated code.
      }
    }
    if (!created) {
      return fail(
        "Could not generate a unique reference code. Please try again.",
        500,
        "REFERENCE_COLLISION"
      );
    }

    await logAppointmentAction("APPOINTMENT_BOOKED", created.id, user?.id ?? null, {
      bookingMode,
      type: input.type,
      ...(user ? { patientId: user.id } : {}),
    });

    return ok({
      appointment: toAppointmentDto(created),
      referenceCode: created.referenceCode,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
