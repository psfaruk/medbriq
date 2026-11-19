import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { VerificationStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/doctors
 * Directory of every doctor profile with joined user and specialty data,
 * newest first.
 */

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const profiles = await db.doctorProfile.findMany({
      include: {
        user: { select: { name: true, email: true } },
        specialties: { include: { specialty: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      items: profiles.map((profile) => ({
        id: profile.id,
        slug: profile.slug,
        name: profile.user.name,
        email: profile.user.email,
        city: profile.city,
        verificationStatus: profile.verificationStatus as VerificationStatus,
        consultationFee: profile.consultationFee,
        experienceYears: profile.experienceYears,
        createdAt: profile.createdAt.toISOString(),
        specialties: profile.specialties.map((ds) => ds.specialty.name),
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
