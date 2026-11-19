import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
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

/** Shape of a doctor profile row with user + specialty names joined. */
type VerificationRow = {
  id: string;
  slug: string;
  city: string;
  regNumber: string | null;
  experienceYears: number;
  consultationFee: number;
  bio: string | null;
  verificationStatus: string;
  verificationNote: string | null;
  createdAt: Date;
  user: { id: string; name: string; email: string; phone: string | null };
  specialties: { specialty: { name: string } }[];
};

function toVerificationItem(profile: VerificationRow): VerificationItem {
  return {
    userId: profile.user.id,
    doctorId: profile.id,
    slug: profile.slug,
    name: profile.user.name,
    email: profile.user.email,
    phone: profile.user.phone,
    city: profile.city,
    regNumber: profile.regNumber,
    experienceYears: profile.experienceYears,
    consultationFee: profile.consultationFee,
    bio: profile.bio,
    specialties: profile.specialties.map((ds) => ds.specialty.name),
    verificationStatus:
      profile.verificationStatus as VerificationItem["verificationStatus"],
    verificationNote: profile.verificationNote,
    submittedAt: profile.createdAt.toISOString(),
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

    const profiles = await db.doctorProfile.findMany({
      where: status === "ALL" ? undefined : { verificationStatus: status },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        specialties: { include: { specialty: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok({ items: profiles.map(toVerificationItem) });
  } catch (err) {
    return handleRouteError(err);
  }
}
