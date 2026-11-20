import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { ROLES } from "@/lib/constants";
import { validateFeeSettings } from "@/lib/fees/engine";
import { requireModule } from "@/lib/modules";
import type { FeeSettingsDto } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/v1/doctor/fee-settings — the signed-in doctor's own settings. */
export async function GET() {
  try {
    requireModule("appointmentBooking");

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to manage fee settings.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can manage fee settings.", 403, "FORBIDDEN");
    }

    const store = getStore();
    const doctor = await store.getDoctorByUserId(user.id);
    if (!doctor) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    const settings = await store.getFeeSettings(doctor.id);
    return ok({ settings: toDto(settings) });
  } catch (err) {
    return handleRouteError(err);
  }
}

const feeSettingsSchema = z.object({
  newPatientFee: z.number().int("New patient fee must be a whole number."),
  returningPatientFee: z.number().int("Returning patient fee must be a whole number."),
  returningValidityValue: z.number().int("Validity must be a whole number."),
  returningValidityUnit: z.enum(["DAYS", "MONTHS"]),
  followUpEnabled: z.boolean(),
  followUpFee: z.number().int("Follow-up fee must be a whole number."),
  followUpValidityValue: z.number().int("Follow-up validity must be a whole number."),
  followUpValidityUnit: z.enum(["DAYS", "MONTHS"]),
  changeReason: z
    .string()
    .trim()
    .max(200, "Change reason must be at most 200 characters.")
    .optional(),
});

/**
 * PUT /api/v1/doctor/fee-settings — update the doctor's own settings.
 *
 * Server-side validation (docs/FEE_SYSTEM.md §1), version bump + immutable
 * history row + audit log in one store transaction. Existing confirmed
 * appointments keep their snapshots — they are never rewritten.
 */
export async function PUT(req: NextRequest) {
  try {
    requireModule("appointmentBooking");

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to manage fee settings.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can manage fee settings.", 403, "FORBIDDEN");
    }

    const store = getStore();
    const doctor = await store.getDoctorByUserId(user.id);
    if (!doctor) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    const raw: unknown = await req.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return fail("Invalid JSON body.", 400, "INVALID_BODY");
    }
    const parsed = feeSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid fee settings.",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Business-rule validation (limits, returning ≤ new, follow-up ≤ new).
    const validated = validateFeeSettings(parsed.data);
    if (!validated.ok) {
      return fail(validated.error, 400, "VALIDATION_ERROR");
    }

    // Ensure the settings row exists (auto-created with defaults on read).
    await store.getFeeSettings(doctor.id);

    const updated = await store.updateFeeSettings(
      doctor.id,
      {
        newPatientFee: validated.value.newPatientFee,
        returningPatientFee: validated.value.returningPatientFee,
        returningValidityValue: validated.value.returningValidityValue,
        returningValidityUnit: validated.value.returningValidityUnit,
        followUpEnabled: validated.value.followUpEnabled,
        followUpFee: validated.value.followUpFee,
        followUpValidityValue: validated.value.followUpValidityValue,
        followUpValidityUnit: validated.value.followUpValidityUnit,
        changeReason:
          parsed.data.changeReason && parsed.data.changeReason.length > 0
            ? parsed.data.changeReason
            : null,
      },
      user.id
    );

    return ok({ settings: toDto(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}

function toDto(row: {
  newPatientFee: number;
  returningPatientFee: number;
  returningValidityValue: number;
  returningValidityUnit: string;
  followUpEnabled: boolean;
  followUpFee: number;
  followUpValidityValue: number;
  followUpValidityUnit: string;
  version: number;
  updatedAt: string;
}): FeeSettingsDto {
  return {
    newPatientFee: row.newPatientFee,
    returningPatientFee: row.returningPatientFee,
    returningValidityValue: row.returningValidityValue,
    returningValidityUnit: row.returningValidityUnit as "DAYS" | "MONTHS",
    followUpEnabled: row.followUpEnabled,
    followUpFee: row.followUpFee,
    followUpValidityValue: row.followUpValidityValue,
    followUpValidityUnit: row.followUpValidityUnit as "DAYS" | "MONTHS",
    version: row.version,
    updatedAt: row.updatedAt,
  };
}
