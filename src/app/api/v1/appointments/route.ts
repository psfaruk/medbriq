import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore, SlotConflictError, ReferenceCodeCollisionError } from "@/lib/data";
import type { AppointmentRecord } from "@/lib/data/types";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  APPOINTMENT_STATUS,
  BOOKING_MODE,
  DEFAULT_SLOT_MINUTES,
  NOTIFICATION_TYPES,
} from "@/lib/constants";
import {
  generateReferenceCode,
  validateBookableSlot,
} from "@/lib/slots";
import { classifyAndPrice } from "@/lib/fees/service";
import { requireModule } from "@/lib/modules";
import {
  dateStrSchema,
  doctorDisplayName,
  logAppointmentAction,
  normalizePhone,
  notifyUser,
  toAppointmentDto,
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
  // ── Fee system (docs/FEE_SYSTEM.md §3) ──
  /** Optional client expectation from a prior price preview — compared
   * against the server's own recomputation, never trusted. */
  expectedFee: z.number().int().nonnegative().optional(),
  expectedPatientType: z.enum(["NEW", "RETURNING", "FOLLOW_UP"]).optional(),
  /** Replay-safe duplicate-submit guard; same key + same payload replays
   * the original appointment instead of double-booking. */
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
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
    const store = getStore();
    const user = await getCurrentUser();

    if (user) {
      const rows = await store.listAppointmentsByPatient(user.id);
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
    // match; the store compares the phone normalized on both sides and the
    // code case-insensitively.
    const rows = await store.findAppointmentsByReferenceCode(code, phone);
    return ok({ items: rows.map(toAppointmentDto) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * POST /api/v1/appointments — create a booking.
 *
 * Correctness notes (docs/FEE_SYSTEM.md §3):
 * - The slot is re-validated server-side (validateBookableSlot) immediately
 *   before the write, but the authoritative double-booking guard is the
 *   (doctorId, slotStart) uniqueness constraint (SQLite unique index in
 *   Prisma mode, the appointments/{doctorId}_{slotStart} doc id in Firestore
 *   mode). If two requests race, exactly one wins and the loser gets a
 *   409 SLOT_TAKEN.
 * - Patient classification and the fee are computed SERVER-SIDE at write
 *   time. Any client expectation (expectedFee / expectedPatientType from a
 *   preview) is compared against the recomputation and a mismatch answers
 *   409 PRICE_CHANGED with the fresh breakdown — the client never sets the
 *   price.
 * - idempotencyKey: a retried submit with the same key replays the original
 *   appointment (idempotentReplay: true) instead of creating a second one.
 * - referenceCode collisions (32^6 space) are retried with fresh codes.
 */
export async function POST(req: NextRequest) {
  try {
    requireModule("appointmentBooking");

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

    const store = getStore();

    // ── Idempotent replay (docs/FEE_SYSTEM.md §3.4) ──
    if (input.idempotencyKey) {
      const existing = await store.findAppointmentByIdempotencyKey(
        input.idempotencyKey
      );
      if (existing) {
        // Same key + same patient/doctor/slot → replay the original booking.
        // A key reused for a DIFFERENT payload is rejected loudly.
        const sameIntent =
          existing.doctor.slug === input.doctorSlug &&
          normalizePhone(existing.patientPhone) ===
            normalizePhone(input.patientPhone) &&
          existing.slotStart === input.slotStartIso;
        if (!sameIntent) {
          return fail(
            "This idempotency key was already used for a different booking.",
            409,
            "IDEMPOTENCY_MISMATCH"
          );
        }
        return ok({
          appointment: toAppointmentDto(existing),
          referenceCode: existing.referenceCode,
          idempotentReplay: true,
        });
      }
    }

    const doctor = await store.getDoctorBySlug(input.doctorSlug);
    if (!doctor || doctor.verificationStatus !== "VERIFIED") {
      return fail("Doctor not available for booking.", 404, "NOT_FOUND");
    }
    if (input.type === "VIDEO") {
      // Telehealth is a separately-gated module (Phase 0 regulatory review —
      // docs/ARCHITECTURE_CORRECTIONS.md #2/#3). requireModule throws
      // ModuleDisabledError → 503 MODULE_DISABLED with the gate reason.
      requireModule("telehealth");
      if (!doctor.supportsVideo) {
        return fail(
          "This doctor does not offer video consultations.",
          400,
          "VIDEO_UNSUPPORTED"
        );
      }
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

    // ── Server-side classification & pricing (docs/FEE_SYSTEM.md §3.1) ──
    // The patient is resolved by account id OR normalized phone so guest
    // bookings keep their history across later sign-in (§2.1).
    const phone = normalizePhone(input.patientPhone);
    const breakdown = await classifyAndPrice({
      doctorId: doctor.id,
      patient: { patientId: user?.id ?? null, phone },
    });

    // Revalidation: a stale expectation never books at a stale price.
    if (
      (input.expectedFee !== undefined &&
        input.expectedFee !== breakdown.fee) ||
      (input.expectedPatientType !== undefined &&
        input.expectedPatientType !== breakdown.patientType)
    ) {
      return fail(
        "The price changed since the preview. Please review the updated breakdown and confirm again.",
        409,
        "PRICE_CHANGED"
      );
    }

    const bookingMode = doctor.requiresApproval
      ? BOOKING_MODE.APPROVAL
      : BOOKING_MODE.INSTANT;
    const status = doctor.requiresApproval
      ? APPOINTMENT_STATUS.PENDING_APPROVAL
      : APPOINTMENT_STATUS.CONFIRMED;
    const fee = breakdown.fee;
    const slotEnd = new Date(
      new Date(slot.startIso).getTime() + DEFAULT_SLOT_MINUTES * 60_000
    ).toISOString();

    let created: AppointmentRecord | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await store.createAppointment({
          referenceCode: generateReferenceCode(),
          doctorId: doctor.id,
          patientId: user?.id ?? null,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          patientAge: input.patientAge ?? null,
          patientGender: input.patientGender ?? null,
          notes: input.notes && input.notes.length > 0 ? input.notes : null,
          slotStart: slot.startIso,
          slotEnd,
          type: input.type,
          status,
          bookingMode,
          fee,
          currency: "BDT",
          // Pricing snapshot — frozen at confirmation (docs/FEE_SYSTEM.md §3.3).
          patientType: breakdown.patientType,
          feeSettingsVersion: breakdown.basis.feeSettingsVersion,
          pricingBasis: JSON.stringify(breakdown.basis),
          pricedAt: breakdown.basis.evaluatedAt,
          idempotencyKey: input.idempotencyKey ?? null,
        });
      } catch (err) {
        if (err instanceof SlotConflictError) {
          return fail(
            "This slot was just booked by someone else. Please choose another slot.",
            409,
            "SLOT_TAKEN"
          );
        }
        if (!(err instanceof ReferenceCodeCollisionError)) throw err;
        // referenceCode collision — astronomically unlikely (32^6 space);
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
      patientType: breakdown.patientType,
      fee,
      feeSettingsVersion: breakdown.basis.feeSettingsVersion,
      ...(user ? { patientId: user.id } : {}),
    });

    // Fire-and-forget notifications (never fail the booking; no medical
    // info in bodies). UTC date label only — the client renders local time.
    const dateLabel = created.slotStart.slice(0, 10);
    const notificationMeta = {
      appointmentId: created.id,
      referenceCode: created.referenceCode,
      doctorSlug: created.doctor.slug,
    };
    if (bookingMode === BOOKING_MODE.APPROVAL) {
      await notifyUser(
        created.doctor.userId,
        NOTIFICATION_TYPES.APPOINTMENT_REQUESTED,
        "New appointment request",
        `${created.patientName} requested ${dateLabel} (${created.referenceCode}).`,
        notificationMeta
      );
    } else if (created.patientId) {
      await notifyUser(
        created.patientId,
        NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
        "Booking confirmed",
        `Your appointment with ${doctorDisplayName(created.doctor.name)} on ${dateLabel} is confirmed (${created.referenceCode}).`,
        notificationMeta
      );
    }

    return ok({
      appointment: toAppointmentDto(created),
      referenceCode: created.referenceCode,
      priceBreakdown: {
        patientType: breakdown.patientType,
        fee: breakdown.fee,
        currency: breakdown.currency,
        explanation: breakdown.explanation,
        basis: breakdown.basis,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
