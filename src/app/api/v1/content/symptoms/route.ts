import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/cache";
import { MEDICAL_DISCLAIMER } from "@/content";
import { publicSymptom, publicSymptomSummaries } from "../_lib/publications";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/content/symptoms — public symptom-guide education.
 *   ?slug=slug → single full guide (404 when not published)
 * Educational only: the API response carries the standing disclaimer and
 * the guides themselves never diagnose.
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (slug) {
      const guide = await publicSymptom(slug);
      if (!guide) {
        return fail("Symptom guide not found.", 404, "NOT_FOUND");
      }
      return ok(
        { guide, disclaimer: MEDICAL_DISCLAIMER },
        { headers: publicCacheHeaders(120) }
      );
    }
    const items = await publicSymptomSummaries();
    return ok(
      { items, disclaimer: MEDICAL_DISCLAIMER },
      { headers: publicCacheHeaders(120) }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
