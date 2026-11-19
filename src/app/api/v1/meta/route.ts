import { db } from "@/lib/db";
import { handleRouteError, ok } from "@/lib/api";
import { LANGUAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/meta — filter option data and platform stats for the UI.
 * cities only includes cities of publicly visible doctors (VERIFIED/PENDING).
 */

const PUBLIC_STATUSES = ["VERIFIED", "PENDING"];

export async function GET() {
  try {
    const [cityRows, verifiedDoctors, pendingDoctors, specialties, hospitals] =
      await Promise.all([
        db.doctorProfile.findMany({
          where: { verificationStatus: { in: PUBLIC_STATUSES } },
          select: { city: true },
          distinct: ["city"],
        }),
        db.doctorProfile.count({ where: { verificationStatus: "VERIFIED" } }),
        db.doctorProfile.count({ where: { verificationStatus: "PENDING" } }),
        db.specialty.count(),
        db.hospital.count(),
      ]);

    const cities = cityRows
      .map((row) => row.city)
      .sort((a, b) => a.localeCompare(b));

    const languages = Object.entries(LANGUAGES).map(([code, label]) => ({
      code,
      label,
    }));

    return ok(
      {
        cities,
        languages,
        platformStats: {
          verifiedDoctors,
          pendingDoctors,
          specialties,
          hospitals,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
