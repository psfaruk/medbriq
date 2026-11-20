import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { VerificationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/verifications/[doctorId]/decision
 * Admin decision on a doctor verification: VERIFIED | REJECTED | MORE_INFO.
 * A note (3..300 chars) is required when rejecting or requesting more info.
 */

const decisionSchema = z
  .object({
    decision: z.enum(["VERIFIED", "REJECTED", "MORE_INFO"], {
      message: "Decision must be VERIFIED, REJECTED or MORE_INFO.",
    }),
    note: z
      .string()
      .trim()
      .min(3, "A note of at least 3 characters is required.")
      .max(300, "Note must be at most 300 characters.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.decision === "REJECTED" || data.decision === "MORE_INFO") &&
      (data.note === undefined || data.note.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "A note is required for this decision.",
      });
    }
  });

const AUDIT_ACTIONS = {
  VERIFIED: "DOCTOR_VERIFIED",
  REJECTED: "DOCTOR_REJECTED",
  MORE_INFO: "DOCTOR_MORE_INFO",
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (admin.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const { doctorId } = await params;

    const body = await req.json().catch(() => null);
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid decision data.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const { decision, note } = parsed.data;

    const store = getStore();
    const existing = await store.getDoctorById(doctorId);
    if (!existing) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    const updated = await store.updateDoctorProfile(doctorId, {
      verificationStatus: decision,
      verificationNote: note ?? null,
      verifiedAt:
        decision === "VERIFIED"
          ? (existing.verifiedAt ?? new Date().toISOString())
          : null,
    });

    await store.createAuditLog({
      actorId: admin.id,
      action: AUDIT_ACTIONS[decision],
      entity: "DoctorProfile",
      entityId: doctorId,
      meta: JSON.stringify({ note: note ?? null }),
    });

    const item: VerificationItem = {
      userId: updated.userId,
      doctorId: updated.id,
      slug: updated.slug,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      city: updated.city,
      regNumber: updated.regNumber,
      experienceYears: updated.experienceYears,
      consultationFee: updated.consultationFee,
      bio: updated.bio,
      specialties: updated.specialties.map((s) => s.name),
      verificationStatus:
        updated.verificationStatus as VerificationItem["verificationStatus"],
      verificationNote: updated.verificationNote,
      submittedAt: updated.createdAt,
    };

    return ok({ item });
  } catch (err) {
    return handleRouteError(err);
  }
}
