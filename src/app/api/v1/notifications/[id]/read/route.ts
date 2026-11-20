import { fail, handleRouteError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/notifications/[id]/read
 * Marks one notification as read. Ownership is enforced by the store
 * (userId must match), so users cannot read each other's notifications.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }

    const marked = await getStore().markNotificationRead(id, user.id);
    if (!marked) {
      return fail("Notification not found.", 404, "NOT_FOUND");
    }

    return ok({ read: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
