import type { MetadataRoute } from "next";

/**
 * robots.txt (spec §14): public pages indexable, API and private surfaces
 * excluded. The authenticated dashboards all render client-side on "/" —
 * no private data is ever in the HTML source (data arrives only through
 * session-scoped APIs), and /api/* is excluded from crawling entirely.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
