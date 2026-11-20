import { getStore } from "@/lib/data";
import { ok, handleRouteError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/hospitals — public hospital directory.
 * Each row carries the count of doctors in the public verification statuses.
 */
export async function GET() {
  try {
    const items = await getStore().listHospitals();
    return ok({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
