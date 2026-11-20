import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getStore } from "@/lib/data";
import { normalizePhone } from "@/lib/phone";
import { classifyAndPrice } from "@/lib/fees/service";
import { requireModule } from "@/lib/modules";
import type { PricePreviewDto } from "@/lib/types";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  doctorSlug: z.string().trim().min(1, "Doctor is required."),
  patientPhone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9\-() ]{8,20}$/,
      "Enter a valid phone number (8-20 digits; may include +, spaces, dashes and parentheses)."
    ),
});

/**
 * POST /api/v1/booking/price-preview — patient classification + price
 * breakdown BEFORE confirmation (docs/FEE_SYSTEM.md §3.2).
 *
 * Guest-eligible: the preview only reveals the classification a booking
 * with the same phone would receive. The authoritative price is recomputed
 * at confirmation — this response is informational, never trusted as input.
 */
export async function POST(req: NextRequest) {
  try {
    requireModule("appointmentBooking");

    const raw: unknown = await req.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return fail("Invalid JSON body.", 400, "INVALID_BODY");
    }
    const parsed = previewSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid preview request.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const store = getStore();
    const doctor = await store.getDoctorBySlug(parsed.data.doctorSlug);
    if (!doctor || doctor.verificationStatus !== "VERIFIED") {
      return fail("Doctor not available for booking.", 404, "NOT_FOUND");
    }

    const phone = normalizePhone(parsed.data.patientPhone);
    const breakdown = await classifyAndPrice({
      doctorId: doctor.id,
      patient: { patientId: null, phone },
    });

    const preview: PricePreviewDto = {
      patientType: breakdown.patientType,
      fee: breakdown.fee,
      currency: breakdown.currency,
      explanation: breakdown.explanation,
      basis: {
        ...breakdown.basis,
        patientPhone: phone,
      },
      feeSettings: {
        newPatientFee: breakdown.feeSettings.newPatientFee,
        returningPatientFee: breakdown.feeSettings.returningPatientFee,
        returningValidityValue: breakdown.feeSettings.returningValidityValue,
        returningValidityUnit: breakdown.feeSettings.returningValidityUnit,
        followUpEnabled: breakdown.feeSettings.followUpEnabled,
        followUpFee: breakdown.feeSettings.followUpFee,
        followUpValidityValue: breakdown.feeSettings.followUpValidityValue,
        followUpValidityUnit: breakdown.feeSettings.followUpValidityUnit,
      },
    };

    return ok({
      preview,
      doctor: {
        slug: doctor.slug,
        name: doctor.name,
        city: doctor.city,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
