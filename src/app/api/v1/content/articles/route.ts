import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/cache";
import { ARTICLE_CATEGORIES, MEDICAL_DISCLAIMER } from "@/content";
import {
  publicArticle,
  publicArticles,
  publishedSlugsFor,
} from "../_lib/publications";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/content/articles — public Health Library article listing.
 *   ?category=slug  → filter to one category
 *   ?slug=slug      → single full article (404 when not published)
 *
 * Publication filtering is server-side (spec §13): DRAFT / EDITOR_REVIEW /
 * MEDICAL_REVIEW / APPROVED items are never served here.
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    if (slug) {
      const article = await publicArticle(slug);
      if (!article) {
        return fail("Article not found.", 404, "NOT_FOUND");
      }
      const published = await publishedSlugsFor(article);
      const related = article.relatedSlugs
        .map((s) => s)
        .filter((s) => published.has(s));
      return ok(
        {
          article,
          relatedSlugs: related,
          disclaimer: MEDICAL_DISCLAIMER,
        },
        { headers: publicCacheHeaders(120) }
      );
    }

    const category = request.nextUrl.searchParams.get("category");
    const items = await publicArticles();
    const filtered = category
      ? items.filter((a) => a.category === category)
      : items;
    return ok(
      {
        items: filtered,
        categories: ARTICLE_CATEGORIES,
        disclaimer: MEDICAL_DISCLAIMER,
      },
      { headers: publicCacheHeaders(120) }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
