import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/password — body { currentPassword?, newPassword }.
 *
 * Signed-in password management. Accounts that already have a password
 * (credentials-registered) must confirm it; Google/phone accounts
 * (passwordHash "" sentinel) may set an initial password without one.
 */

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be at most 100 characters."),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }

    const body = await req.json().catch(() => null);
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const store = getStore();
    const record = await store.findUserByEmail(user.email);
    if (!record) {
      return fail("Account not found.", 404, "NOT_FOUND");
    }

    const hasPassword = record.passwordHash !== "";
    if (hasPassword) {
      const currentOk =
        parsed.data.currentPassword !== undefined &&
        verifyPassword(parsed.data.currentPassword, record.passwordHash);
      if (!currentOk) {
        return fail(
          "Current password is incorrect.",
          401,
          "INVALID_CREDENTIALS"
        );
      }
    }

    await store.updateUserPassword(
      user.id,
      hashPassword(parsed.data.newPassword)
    );

    await store.createAuditLog({
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
      meta: JSON.stringify({ email: user.email }),
    });

    return ok({ changed: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
