import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import type { DoctorRecord } from "@/lib/data/types";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { VerificationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/verifications?status=PENDING|UNDER_REVIEW|MORE_INFO|REJECTED|VERIFIED|ALL
 * Doctor verification queue. Defaults to PENDING, ordered oldest-first so the
 * earliest submissions are reviewed first.
 */

const statusSchema = z
  .enum(["PENDING", "UNDER_REVIEW", "MORE_INFO", "REJECTED", "VERIFIED", "ALL"])
  .default("PENDING");

/** Map a store doctor record (user + specialties joined) to the queue item. */
function toVerificationItem(profile: DoctorRecord): VerificationItem {
  return {
    userId: profile.userId,
    doctorId: profile.id,
    slug: profile.slug,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    regNumber: profile.regNumber,
    experienceYears: profile.experienceYears,
    consultationFee: profile.consultationFee,
    bio: profile.bio,
    specialties: profile.specialties.map((s) => s.name),
    verificationStatus:
      profile.verificationStatus as VerificationItem["verificationStatus"],
    verificationNote: profile.verificationNote,
    submittedAt: profile.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const parsedStatus = statusSchema.safeParse(
      req.nextUrl.searchParams.get("status") ?? undefined
    );
    if (!parsedStatus.success) {
      return fail(
        "Status must be PENDING, UNDER_REVIEW, MORE_INFO, REJECTED, VERIFIED or ALL.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const status = parsedStatus.data;

    const profiles = await getStore().listDoctors({
      ...(status !== "ALL" ? { verificationStatus: status } : {}),
      order: "createdAtAsc",
    });

    return ok({ items: profiles.map(toVerificationItem) });
  } catch (err) {
    return handleRouteError(err);
  }
}
