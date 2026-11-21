import type { MetadataRoute } from "next";

/**
 * XML sitemap (spec §14). The sandbox exposes a single route "/", so the
 * sitemap lists the homepage plus the canonical public portal entry points
 * (query-param views, which are stable and crawlable). When the portal
 * lifts into real routes (post-sandbox), each entry becomes its own URL
 * and doctor/hospital/article slugs are enumerated here from the data
 * store — the structure below anticipates that 1:1.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const now = new Date();

  const entries: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/?view=doctors", priority: 0.9, changeFrequency: "daily" },
    { path: "/?view=hospitals", priority: 0.8, changeFrequency: "weekly" },
    { path: "/?view=specialties", priority: 0.7, changeFrequency: "weekly" },
    { path: "/?view=library", priority: 0.8, changeFrequency: "daily" },
    { path: "/?view=symptoms", priority: 0.7, changeFrequency: "weekly" },
    { path: "/?view=equipment", priority: 0.7, changeFrequency: "weekly" },
    { path: "/?view=childrens-health", priority: 0.6, changeFrequency: "monthly" },
    { path: "/?view=family-health", priority: 0.6, changeFrequency: "monthly" },
    { path: "/?view=community-health", priority: 0.6, changeFrequency: "monthly" },
    { path: "/?view=for-patients", priority: 0.7, changeFrequency: "monthly" },
    { path: "/?view=for-doctors", priority: 0.7, changeFrequency: "monthly" },
    { path: "/?view=for-hospitals", priority: 0.7, changeFrequency: "monthly" },
    { path: "/?view=for-providers", priority: 0.5, changeFrequency: "monthly" },
    { path: "/?view=how-it-works", priority: 0.6, changeFrequency: "monthly" },
    { path: "/?view=verification", priority: 0.6, changeFrequency: "monthly" },
    { path: "/?view=emergency", priority: 0.6, changeFrequency: "monthly" },
    { path: "/?view=faq", priority: 0.5, changeFrequency: "monthly" },
    { path: "/?view=tools", priority: 0.5, changeFrequency: "monthly" },
    { path: "/?view=calendar", priority: 0.4, changeFrequency: "monthly" },
  ];

  return entries.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
