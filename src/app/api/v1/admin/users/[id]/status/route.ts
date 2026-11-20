import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, USER_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED]),
});

/**
 * POST /api/v1/admin/users/[id]/status — body { status: "ACTIVE" | "SUSPENDED" }.
 *
 * Admin-only account suspension/reactivation. Guards: the target must exist,
 * admins cannot change their own status, and ADMIN accounts are protected
 * (only a direct database intervention can demote/suspend an admin).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const admin = await getCurrentUser();
    if (!admin) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (admin.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const raw: unknown = await req.json().catch(() => null);
    const parsed = statusSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const store = getStore();
    // Demo-scale target lookup: the shared store contract has no single-user
    // fetch by id, so resolve it from the directory (bounded, admin-only).
    const target = (await store.listUsers({})).find((u) => u.id === id);
    if (!target) {
      return fail("User not found.", 404, "NOT_FOUND");
    }
    if (target.id === admin.id) {
      return fail(
        "You cannot change the status of your own account.",
        400,
        "CANNOT_MODIFY_SELF"
      );
    }
    if (target.role === ROLES.ADMIN) {
      return fail(
        "Admin accounts cannot be suspended or reactivated from the console.",
        403,
        "FORBIDDEN"
      );
    }

    await store.updateUserStatus(target.id, parsed.data.status);

    await store.createAuditLog({
      actorId: admin.id,
      action: "USER_STATUS_CHANGED",
      entity: "User",
      entityId: target.id,
      meta: JSON.stringify({ targetUserId: target.id, status: parsed.data.status }),
    });

    return ok({ status: parsed.data.status });
  } catch (err) {
    return handleRouteError(err);
  }
}
