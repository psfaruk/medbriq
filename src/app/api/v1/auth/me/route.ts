import { ok, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

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
