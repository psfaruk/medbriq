import { getStore } from "@/lib/data";
import { ok, handleRouteError } from "@/lib/api";
import { cached, publicCacheHeaders } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/hospitals — public hospital directory.
 * Each row carries the count of doctors in the public verification statuses.
 */
export async function GET() {
  try {
    const items = await cached("v1:hospitals", 120_000, () =>
      getStore().listHospitals()
    );
    return ok({ items }, { headers: publicCacheHeaders(60) });
  } catch (err) {
    return handleRouteError(err);
  }
}
