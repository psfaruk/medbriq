import { getStore, storeKind } from "@/lib/data";
import { handleRouteError, ok } from "@/lib/api";
import { cached, publicCacheHeaders } from "@/lib/cache";
import { LANGUAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/meta — filter option data and platform stats for the UI.
 * cities only includes cities of publicly visible doctors (VERIFIED/PENDING).
 * `dataStore` reports the active backend ("prisma" | "firestore").
 */

const PUBLIC_STATUSES = ["VERIFIED", "PENDING"];

export async function GET() {
  try {
    const data = await cached("v1:meta", 120_000, async () => {
      const meta = await getStore().getReferenceMeta(PUBLIC_STATUSES);

      const cities = meta.cities.sort((a, b) => a.localeCompare(b));

      const languages = Object.entries(LANGUAGES).map(([code, label]) => ({
        code,
        label,
      }));

      return {
        cities,
        languages,
        platformStats: {
          verifiedDoctors: meta.verifiedDoctors,
          pendingDoctors: meta.pendingDoctors,
          specialties: meta.specialtyCount,
          hospitals: meta.hospitalCount,
        },
        dataStore: storeKind(),
      };
    });

    return ok(data, { headers: publicCacheHeaders(60) });
  } catch (err) {
    return handleRouteError(err);
  }
}
