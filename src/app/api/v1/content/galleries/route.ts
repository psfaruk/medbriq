import { ok, handleRouteError } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/cache";
import { childrenGallery, familyGallery } from "@/content";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/content/galleries — children's health & family/community
 * healthcare education galleries.
 *   ?kind=children | family (default: both)
 * All images are AI-generated illustrative scenes — the response states
 * this explicitly so clients never present them as photographs of real
 * patients or facilities.
 */
export async function GET(request: Request) {
  try {
    const kind = new URL(request.url).searchParams.get("kind");
    const data: Record<string, unknown> = {
      aiIllustrationNotice:
        "All gallery images are AI-generated illustrative scenes. They do not show real patients, real families or real hospitals.",
    };
    if (!kind || kind === "children") data.children = childrenGallery();
    if (!kind || kind === "family") data.family = familyGallery();
    return ok(data, { headers: publicCacheHeaders(600) });
  } catch (err) {
    return handleRouteError(err);
  }
}
