import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { CONTENT_STATUSES, CONTENT_AUTHOR } from "@/content";
import { adminContentList } from "../../content/_lib/publications";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/content — the admin Content Management overview.
 * Lists every content item (all collections) with workflow status,
 * medical-review state and publication override. Admin-only.
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
    const items = await adminContentList();
    const byStatus = Object.fromEntries(
      CONTENT_STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])
    );
    return ok({
      items,
      byStatus,
      workflow: CONTENT_STATUSES,
      author: CONTENT_AUTHOR,
      policy:
        "Medical content may only be force-published after qualified medical review. Demo items ship with medicalReviewer null — the honest 'medical review pending' label stays visible until a real review is recorded.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
