import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/v1/admin/reviews/[id]
 * Admin-only moderation delete. Every deletion is audit-logged.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const deleted = await getStore().deleteReview(id);
    if (!deleted) {
      return fail("Review not found.", 404, "NOT_FOUND");
    }

    await getStore().createAuditLog({
      actorId: user.id,
      action: "REVIEW_DELETED",
      entity: "Review",
      entityId: id,
      meta: JSON.stringify({ reviewId: id }),
    });

    return ok({ deleted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
