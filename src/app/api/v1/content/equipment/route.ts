import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/cache";
import { MEDICAL_DISCLAIMER } from "@/content";
import {
  publicEquipment,
  publicEquipmentSummaries,
} from "../_lib/publications";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/content/equipment — public medical-equipment education.
 *   ?slug=slug → single full guide (404 when not published)
 * Educational only: no brands, no products, no efficacy claims.
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (slug) {
      const guide = await publicEquipment(slug);
      if (!guide) {
        return fail("Equipment guide not found.", 404, "NOT_FOUND");
      }
      return ok(
        { guide, disclaimer: MEDICAL_DISCLAIMER },
        { headers: publicCacheHeaders(120) }
      );
    }
    const items = await publicEquipmentSummaries();
    return ok(
      { items, disclaimer: MEDICAL_DISCLAIMER },
      { headers: publicCacheHeaders(120) }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
