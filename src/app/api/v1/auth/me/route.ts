import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { normalizeBdPhone } from "@/lib/phone";
import type { UserProfilePatch } from "@/lib/data/types";
import { toSessionUser } from "@/app/api/v1/_lib/session-user";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/me
 * Resolves the current session. Always 200 — `user` is null for guests and
 * expired/suspended sessions, so the client can treat it as "not signed in".
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok({ user });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * PATCH /api/v1/auth/me — body { name?, phone? }.
 *
 * Self-service profile update. `phone` accepts null/"" to clear, or a
 * Bangladeshi mobile number that is normalized to +8801XXXXXXXXX; a phone
 * already linked to a DIFFERENT account is rejected (409 PHONE_TAKEN).
 */
const patchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be at most 80 characters.")
    .optional(),
  phone: z.union([z.string(), z.null()]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid profile update.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    const patch: UserProfilePatch = {};
    if (input.name !== undefined) {
      patch.name = input.name;
    }

    // phone: undefined = leave unchanged, null/"" = clear, else normalize.
    let newPhone: string | null | undefined;
    if (input.phone === null || input.phone === "") {
      newPhone = null;
    } else if (input.phone !== undefined) {
      const normalized = normalizeBdPhone(input.phone);
      if (!normalized) {
        return fail(
          "Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX).",
          400,
          "VALIDATION_ERROR"
        );
      }
      newPhone = normalized;
    }

    if (newPhone !== undefined && newPhone !== null && newPhone !== user.phone) {
      const existing = await getStore().findUserByPhone(newPhone);
      if (existing && existing.id !== user.id) {
        return fail(
          "This phone number is already linked to another account.",
          409,
          "PHONE_TAKEN"
        );
      }
    }
    if (newPhone !== undefined) {
      patch.phone = newPhone;
    }

    if (Object.keys(patch).length === 0) {
      // Nothing to change — echo the current session user.
      return ok({ user });
    }

    const updated = await getStore().updateUserProfile(user.id, patch);
    return ok({ user: toSessionUser(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
