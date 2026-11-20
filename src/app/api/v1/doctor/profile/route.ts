import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { LANGUAGES, ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/doctor/profile
 * Partial update of editable DoctorProfile fields. `videoConsultFee: null`
 * explicitly clears the video fee; `chamberAddress: null` clears the address.
 * Returns the refreshed editable fields (plus verificationStatus) so the
 * dashboard form can re-sync.
 */

const patchSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(2000, "Bio must be at most 2000 characters.")
    .nullable()
    .optional(),
  experienceYears: z
    .number()
    .int("Experience must be a whole number of years.")
    .min(0, "Experience cannot be negative.")
    .max(60, "Experience must be at most 60 years.")
    .optional(),
  consultationFee: z
    .number()
    .positive("Consultation fee must be greater than zero.")
    .optional(),
  followUpFee: z.number().min(0, "Follow-up fee cannot be negative.").optional(),
  videoConsultFee: z
    .number()
    .positive("Video consultation fee must be greater than zero.")
    .nullable()
    .optional(),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters.")
    .max(60, "City must be at most 60 characters.")
    .optional(),
  chamberAddress: z
    .string()
    .trim()
    .max(200, "Chamber address must be at most 200 characters.")
    .nullable()
    .optional(),
  languages: z.string().optional(),
  supportsVideo: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail(
        "This profile is only available to doctor accounts.",
        403,
        "FORBIDDEN"
      );
    }
    const store = getStore();
    const profile = await store.getDoctorByUserId(user.id);
    if (!profile) {
      return fail("Doctor profile not found.", 404, "PROFILE_NOT_FOUND");
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid profile data.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    // Languages must arrive as comma-separated known codes, e.g. "bn,en".
    let languages: string | undefined;
    if (input.languages !== undefined) {
      const codes = input.languages
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (codes.length === 0) {
        return fail("Select at least one language.", 400, "VALIDATION_ERROR");
      }
      const invalid = codes.find((c) => !(c in LANGUAGES));
      if (invalid) {
        return fail(
          `Unsupported language code: ${invalid}`,
          400,
          "VALIDATION_ERROR"
        );
      }
      languages = codes.join(",");
    }

    const updatedFields: string[] = [];

    if (input.bio !== undefined) {
      updatedFields.push("bio");
    }
    if (input.experienceYears !== undefined) {
      updatedFields.push("experienceYears");
    }
    if (input.consultationFee !== undefined) {
      updatedFields.push("consultationFee");
    }
    if (input.followUpFee !== undefined) {
      updatedFields.push("followUpFee");
    }
    if (input.videoConsultFee !== undefined) {
      updatedFields.push("videoConsultFee");
    }
    if (input.city !== undefined) {
      updatedFields.push("city");
    }
    if (input.chamberAddress !== undefined) {
      updatedFields.push("chamberAddress");
    }
    if (languages !== undefined) {
      updatedFields.push("languages");
    }
    if (input.supportsVideo !== undefined) {
      updatedFields.push("supportsVideo");
    }
    if (input.requiresApproval !== undefined) {
      updatedFields.push("requiresApproval");
    }

    const updated = await store.updateDoctorProfile(profile.id, {
      ...(input.bio !== undefined
        ? {
            bio:
              input.bio !== null && input.bio.length > 0 ? input.bio : null,
          }
        : {}),
      ...(input.experienceYears !== undefined
        ? { experienceYears: input.experienceYears }
        : {}),
      ...(input.consultationFee !== undefined
        ? { consultationFee: input.consultationFee }
        : {}),
      ...(input.followUpFee !== undefined
        ? { followUpFee: input.followUpFee }
        : {}),
      ...(input.videoConsultFee !== undefined
        ? { videoConsultFee: input.videoConsultFee }
        : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.chamberAddress !== undefined
        ? {
            chamberAddress:
              input.chamberAddress !== null && input.chamberAddress.length > 0
                ? input.chamberAddress
                : null,
          }
        : {}),
      ...(languages !== undefined ? { languages } : {}),
      ...(input.supportsVideo !== undefined
        ? { supportsVideo: input.supportsVideo }
        : {}),
      ...(input.requiresApproval !== undefined
        ? { requiresApproval: input.requiresApproval }
        : {}),
    });

    await store.createAuditLog({
      actorId: user.id,
      action: "DOCTOR_PROFILE_UPDATED",
      entity: "DoctorProfile",
      entityId: profile.id,
      meta: JSON.stringify({ updatedFields }),
    });

    return ok({
      doctor: {
        bio: updated.bio,
        experienceYears: updated.experienceYears,
        consultationFee: updated.consultationFee,
        followUpFee: updated.followUpFee,
        videoConsultFee: updated.videoConsultFee,
        city: updated.city,
        chamberAddress: updated.chamberAddress,
        languages: updated.languages,
        supportsVideo: updated.supportsVideo,
        requiresApproval: updated.requiresApproval,
        regNumber: updated.regNumber,
        verificationStatus: updated.verificationStatus,
        verificationNote: updated.verificationNote,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
