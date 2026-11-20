import { fail, handleRouteError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/notifications/read-all
 * Marks every owned notification as read; returns the updated count.
 * (Static segment "read-all" coexists with the dynamic [id] folder —
 * Next.js resolves the static route first, which is exactly what we want.)
 */
export async function POST() {
  try {
    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }

    const updated = await getStore().markAllNotificationsRead(user.id);
    return ok({ updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
