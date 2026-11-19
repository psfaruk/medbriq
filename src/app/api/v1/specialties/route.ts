import { db } from "@/lib/db";
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
    const rows = await db.specialty.findMany({
      include: {
        _count: {
          select: {
            doctors: {
              where: {
                doctor: { verificationStatus: { in: PUBLIC_STATUSES } },
              },
            },
          },
        },
      },
    });

    const items: SpecialtyInfo[] = rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        nameBn: row.nameBn,
        slug: row.slug,
        icon: row.icon,
        doctorCount: row._count.doctors,
      }))
      .sort(
        (a, b) => b.doctorCount - a.doctorCount || a.name.localeCompare(b.name)
      );

    return ok({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err);
  }
}
