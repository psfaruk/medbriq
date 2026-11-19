import { getStore, storeKind } from "@/lib/data";
import { handleRouteError, ok } from "@/lib/api";
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
    const meta = await getStore().getReferenceMeta(PUBLIC_STATUSES);

    const cities = meta.cities.sort((a, b) => a.localeCompare(b));

    const languages = Object.entries(LANGUAGES).map(([code, label]) => ({
      code,
      label,
    }));

    return ok(
      {
        cities,
        languages,
        platformStats: {
          verifiedDoctors: meta.verifiedDoctors,
          pendingDoctors: meta.pendingDoctors,
          specialties: meta.specialtyCount,
          hospitals: meta.hospitalCount,
        },
        dataStore: storeKind(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
