import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/reviews
 * Admin-only moderation queue: the most recent reviews across all doctors
 * (with doctor names/slugs), newest first, capped at 100.
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

    const items = await getStore().listRecentReviews(100);
    return ok({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
