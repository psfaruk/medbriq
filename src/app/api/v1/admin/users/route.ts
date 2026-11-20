import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/users?role=PATIENT|DOCTOR|ADMIN&q=...
 * Admin-only user directory with an optional role filter and a
 * name/email/phone search (matching happens in the store).
 */

const querySchema = z.object({
  role: z.enum([ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN]).optional(),
  q: z.string().trim().max(120, "Search must be at most 120 characters.").optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const rawRole = req.nextUrl.searchParams.get("role")?.trim() ?? "";
    const rawQ = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const parsed = querySchema.safeParse({
      role: rawRole.length > 0 ? rawRole : undefined,
      q: rawQ.length > 0 ? rawQ : undefined,
    });
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid query.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const items = await getStore().listUsers({
      role: parsed.data.role,
      q: parsed.data.q,
    });
    return ok({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
