import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import type { NotificationItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications
 * The signed-in user's notification center: newest-first list (capped at 50)
 * plus the unread badge count.
 */
export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }

    const store = getStore();
    const [records, unreadCount] = await Promise.all([
      store.listNotifications(user.id, 50),
      store.countUnreadNotifications(user.id),
    ]);

    // Records match the NotificationItem DTO except for the userId column.
    const items: NotificationItem[] = records.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      meta: n.meta,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));

    return ok({ items, unreadCount });
  } catch (err) {
    return handleRouteError(err);
  }
}
