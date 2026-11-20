import { getStore } from "@/lib/data";
import { handleRouteError, ok } from "@/lib/api";
import type { SpecialtyInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/specialties — all specialties with their public doctor counts.
 * doctorCount only includes doctors with verificationStatus VERIFIED or
 * PENDING (REJECTED / MORE_INFO are excluded everywhere public).
 * Ordered by doctorCount desc, then name.
 */

const PUBLIC_STATUSES = ["VERIFIED", "PENDING"];

export async function GET() {
  try {
    const items: SpecialtyInfo[] = await getStore()
      .getSpecialtiesWithDoctorCounts(PUBLIC_STATUSES)
      .then((rows) =>
        rows.sort(
          (a, b) => b.doctorCount - a.doctorCount || a.name.localeCompare(b.name)
        )
      );

    return ok({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err);
  }
}
