import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { AuditLogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/audit-logs?limit=50
 * Most recent audit trail entries with the acting user's name.
 */

const limitSchema = z.coerce
  .number()
  .int("Limit must be a whole number.")
  .min(1, "Limit must be at least 1.")
  .max(200, "Limit must be at most 200.")
  .default(50);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const parsedLimit = limitSchema.safeParse(
      req.nextUrl.searchParams.get("limit") ?? undefined
    );
    if (!parsedLimit.success) {
      return fail(
        parsedLimit.error.issues[0]?.message ?? "Invalid limit.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const logs = await getStore().listAuditLogs(parsedLimit.data);

    const items: AuditLogItem[] = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      meta: log.meta,
      createdAt: log.createdAt,
      actorName: log.actorName,
    }));

    return ok({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
