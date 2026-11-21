import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { setPublicationOverride } from "../../../content/_lib/publications";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/admin/content/[key] — toggle an item's publication.
 * key format: "{collection}:{slug}" (article | symptom | equipment).
 *
 * The override persists in PlatformSetting; `served: true` means the public
 * content APIs will (or will not) return the item. Admin-only, audited
 * through the standard admin session (no anonymous publication changes).
 */
const bodySchema = z.object({
  action: z.literal("publish"),
  published: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }

    const { key } = await context.params;
    const match = /^(article|symptom|equipment):([a-z0-9-]+)$/.exec(key ?? "");
    if (!match) {
      return fail("Invalid content key.", 400, "INVALID_KEY");
    }
    const [, collection, slug] = match;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return fail("Body must be { action: 'publish', published: boolean }.", 400, "INVALID_BODY");
    }

    await setPublicationOverride(
      collection as "article" | "symptom" | "equipment",
      slug,
      parsed.data.published
    );
    return ok({ key, published: parsed.data.published });
  } catch (err) {
    return handleRouteError(err);
  }
}
