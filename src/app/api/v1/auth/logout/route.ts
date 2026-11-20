import { ok, handleRouteError } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/logout
 * Deletes the session row (if any) and clears the cookie. Idempotent.
 */
export async function POST() {
  try {
    await destroySession();
    return ok({});
  } catch (err) {
    return handleRouteError(err);
  }
}
