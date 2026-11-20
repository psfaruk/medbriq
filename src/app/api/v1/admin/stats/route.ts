import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/stats
 * Platform counters for the admin console overview cards.
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

    const stats = await getStore().getAdminStats();
    return ok(stats);
  } catch (err) {
    return handleRouteError(err);
  }
}
