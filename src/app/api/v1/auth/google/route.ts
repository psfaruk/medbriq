import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { getGoogleClientId, verifyGoogleIdToken } from "@/lib/google";
import { toSessionUser } from "@/app/api/v1/_lib/session-user";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/google — body { credential }.
 *
 * Google Identity Services sign-in. The browser button returns a JWT
 * `credential`; it is verified server-side against Google's tokeninfo
 * endpoint (audience = GOOGLE_CLIENT_ID, verified email, not expired).
 * A matching account is linked/signed in, a new email becomes a PATIENT.
 */

const googleSchema = z.object({
  credential: z.string().min(1, "Google credential is required."),
});

export async function POST(req: NextRequest) {
  try {
    const clientId = getGoogleClientId();
    if (!clientId) {
      return fail(
        "Google sign-in is not configured on this deployment.",
        503,
        "GOOGLE_NOT_CONFIGURED"
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = googleSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const identity = await verifyGoogleIdToken(parsed.data.credential);
    if (!identity) {
      return fail(
        "Google sign-in could not be verified. Try again.",
        400,
        "INVALID_GOOGLE_TOKEN"
      );
    }

    const store = getStore();
    const { user, created } = await store.upsertGoogleUser({
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.picture,
    });

    if (user.status !== "ACTIVE") {
      return fail(
        "This account is not available. Please contact support if you believe this is a mistake.",
        403,
        "ACCOUNT_SUSPENDED"
      );
    }

    if (created) {
      await store.createAuditLog({
        actorId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
        meta: JSON.stringify({ provider: "google", email: identity.email }),
      });
    }

    await createSession(user.id);
    return ok({ user: toSessionUser(user), isNewAccount: created });
  } catch (err) {
    return handleRouteError(err);
  }
}
