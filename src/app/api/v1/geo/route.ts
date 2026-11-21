import { ok, handleRouteError } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/cache";
import { GEO_DIVISIONS } from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/geo — Bangladesh administrative reference data.
 *   (no params) → full tree: 8 divisions → 64 districts → upazilas
 *   ?division=X → one division with districts + upazilas
 *   ?district=Y → districts entry with upazilas (null when unknown)
 * This is REFERENCE GEOGRAPHY ONLY: a listed district or upazila never
 * implies that any doctor or hospital is registered there. Coverage data
 * comes from the doctors/hospitals endpoints.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const division = url.searchParams.get("division");
    const district = url.searchParams.get("district");

    if (district) {
      for (const div of GEO_DIVISIONS) {
        const d = div.districts.find((x) => x.name === district);
        if (d) {
          return ok(
            { district: d, division: div.name },
            { headers: publicCacheHeaders(86400) }
          );
        }
      }
      return ok({ district: null, division: null }, { headers: publicCacheHeaders(86400) });
    }

    if (division) {
      const div = GEO_DIVISIONS.find((d) => d.name === division);
      return ok(
        { division: div ?? null },
        { headers: publicCacheHeaders(86400) }
      );
    }

    return ok(
      { divisions: GEO_DIVISIONS },
      { headers: publicCacheHeaders(86400) }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
