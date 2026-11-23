import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Web-push (FCM) token registration.
 *
 * POST   /api/v1/push/subscribe  { token, platform? } — register/refresh
 * DELETE /api/v1/push/subscribe  { token }             — unregister
 *
 * The client obtains the token via the Firebase web SDK (see
 * src/lib/firebase.ts) after the user grants notification permission, then
 * keeps it registered here. notifyUser() fans every in-app notification
 * out to these tokens (src/lib/push.ts).
 */

const subscribeSchema = z.object({
  token: z
    .string()
    .trim()
    .min(64, "FCM registration tokens are long opaque strings.")
    .max(512),
  platform: z.enum(["web", "android", "ios"]).default("web"),
});

const unsubscribeSchema = z.object({
  token: z.string().trim().min(64).max(512),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    const raw = await req.json().catch(() => null);
    const parsed = subscribeSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid token.",
        400,
        "INVALID_TOKEN"
      );
    }
    await getStore().upsertPushToken(
      user.id,
      parsed.data.token,
      parsed.data.platform
    );
    return ok({ subscribed: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    const raw = await req.json().catch(() => null);
    const parsed = unsubscribeSchema.safeParse(raw);
    if (!parsed.success) {
      return fail("Invalid token.", 400, "INVALID_TOKEN");
    }
    // Owner-scoped: the authenticated user may only unregister their own
    // device token (prevents killing another user's push subscription).
    await getStore().removePushToken(parsed.data.token, user.id);
    return ok({ subscribed: false });
  } catch (err) {
    return handleRouteError(err);
  }
}
