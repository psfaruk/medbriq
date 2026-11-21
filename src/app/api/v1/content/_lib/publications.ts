import { db } from "@/lib/db";
import { cached, invalidateMemoryCache } from "@/lib/cache";
import {
  ARTICLES,
  EQUIPMENT_GUIDES,
  SYMPTOM_GUIDES,
  contentKey,
  type Article,
  type ContentStatus,
  type EquipmentGuide,
  type SymptomGuide,
} from "@/content";

/**
 * Content publication resolution (spec §13).
 *
 * Workflow gate: an item is served publicly only when its module status is
 * PUBLISHED. Admins can additionally override publication per item; the
 * override is persisted in PlatformSetting under `content:pub:{collection}:{slug}`
 * ("true" = force-publish e.g. after medical review, "false" = unlist).
 *
 * Overrides are read via Prisma directly (like the v2 dashboards): locally
 * this is the real DB; on Firestore deployments the read degrades
 * gracefully to module defaults if the table is unavailable.
 */

const OVERRIDE_PREFIX = "content:pub:";

type Overrides = Map<string, boolean>;

async function loadOverrides(): Promise<Overrides> {
  try {
    const rows = await db.platformSetting.findMany({
      where: { key: { startsWith: OVERRIDE_PREFIX } },
      select: { key: true, value: true },
    });
    const map = new Map<string, boolean>();
    for (const row of rows) {
      map.set(row.key.slice(OVERRIDE_PREFIX.length), row.value === "true");
    }
    return map;
  } catch {
    // DB unavailable (e.g. exotic store config) — fall back to module truth.
    return new Map();
  }
}

function overridesCached(): Promise<Overrides> {
  return cached("content:overrides", 30_000, loadOverrides);
}

export async function setPublicationOverride(
  collection: "article" | "symptom" | "equipment",
  slug: string,
  published: boolean
): Promise<void> {
  const key = `${OVERRIDE_PREFIX}${contentKey(collection, slug)}`;
  if (published) {
    await db.platformSetting.upsert({
      where: { key },
      create: { key, value: "true" },
      update: { value: "true" },
    });
  } else {
    await db.platformSetting.upsert({
      where: { key },
      create: { key, value: "false" },
      update: { value: "false" },
    });
  }
  invalidateMemoryCache("content:");
}

function isPubliclyServed(
  status: ContentStatus,
  slug: string,
  collection: "article" | "symptom" | "equipment",
  overrides: Overrides
): boolean {
  const override = overrides.get(contentKey(collection, slug));
  if (override !== undefined) return override;
  return status === "PUBLISHED";
}

/** Public, non-diagnostic summary shapes (no workflow internals). */
export type ArticleSummaryDto = {
  slug: string;
  title: string;
  titleBn: string | null;
  summary: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readMinutes: number;
  emergencyNote: boolean;
};

export type SymptomSummaryDto = {
  slug: string;
  title: string;
  titleBn: string | null;
  summary: string;
  category: string | null;
  image: string | null;
};

export type EquipmentSummaryDto = {
  slug: string;
  name: string;
  nameBn: string | null;
  summary: string;
  icon: string;
  category: string | null;
  image: string | null;
};

function readMinutes(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

export async function publicArticles(): Promise<ArticleSummaryDto[]> {
  const overrides = await overridesCached();
  return ARTICLES.filter((a) =>
    isPubliclyServed(a.status, a.slug, "article", overrides)
  ).map((a) => ({
    slug: a.slug,
    title: a.title,
    titleBn: a.titleBn,
    summary: a.summary,
    category: a.category,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    readMinutes: readMinutes(
      a.sections.map((s) => s.body).join(" ") + a.summary
    ),
    emergencyNote: !!a.emergencyNote,
  }));
}

export async function publicArticle(slug: string): Promise<Article | null> {
  const overrides = await overridesCached();
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) return null;
  if (!isPubliclyServed(article.status, article.slug, "article", overrides)) {
    return null;
  }
  return article;
}

export async function publicSymptomSummaries(): Promise<SymptomSummaryDto[]> {
  const overrides = await overridesCached();
  return SYMPTOM_GUIDES.filter((s) =>
    isPubliclyServed(s.status, s.slug, "symptom", overrides)
  ).map((s) => ({
    slug: s.slug,
    title: s.title,
    titleBn: s.titleBn,
    summary: s.summary,
    category: s.category ?? null,
    image: s.image ?? null,
  }));
}

export async function publicSymptom(slug: string): Promise<SymptomGuide | null> {
  const overrides = await overridesCached();
  const guide = SYMPTOM_GUIDES.find((s) => s.slug === slug);
  if (!guide) return null;
  if (!isPubliclyServed(guide.status, guide.slug, "symptom", overrides)) {
    return null;
  }
  return guide;
}

export async function publicEquipmentSummaries(): Promise<EquipmentSummaryDto[]> {
  const overrides = await overridesCached();
  return EQUIPMENT_GUIDES.filter((e) =>
    isPubliclyServed(e.status, e.slug, "equipment", overrides)
  ).map((e) => ({
    slug: e.slug,
    name: e.name,
    nameBn: e.nameBn,
    summary: e.summary,
    icon: e.icon,
    category: e.category ?? null,
    image: e.image ?? null,
  }));
}

export async function publicEquipment(slug: string): Promise<EquipmentGuide | null> {
  const overrides = await overridesCached();
  const guide = EQUIPMENT_GUIDES.find((e) => e.slug === slug);
  if (!guide) return null;
  if (!isPubliclyServed(guide.status, guide.slug, "equipment", overrides)) {
    return null;
  }
  return guide;
}

/** Related published articles for an article (admin-invisible filtering). */
export async function publishedSlugsFor(article: Article): Promise<Set<string>> {
  const overrides = await overridesCached();
  const set = new Set<string>();
  for (const a of ARTICLES) {
    if (isPubliclyServed(a.status, a.slug, "article", overrides)) {
      set.add(a.slug);
    }
  }
  return set;
}

// ── Admin-facing (includes workflow internals) ─────────────────────

export type AdminContentItem = {
  collection: "article" | "symptom" | "equipment";
  key: string; // "article:slug"
  title: string;
  category: string;
  status: ContentStatus;
  modulePublished: boolean;
  override: boolean | null;
  served: boolean;
  medicalReviewer: string | null;
  publishedAt: string;
  updatedAt: string;
};

export async function adminContentList(): Promise<AdminContentItem[]> {
  const overrides = await overridesCached();
  const items: AdminContentItem[] = [];
  for (const a of ARTICLES) {
    const override = overrides.get(contentKey("article", a.slug)) ?? null;
    items.push({
      collection: "article",
      key: contentKey("article", a.slug),
      title: a.title,
      category: a.category,
      status: a.status,
      modulePublished: a.status === "PUBLISHED",
      override,
      served: isPubliclyServed(a.status, a.slug, "article", overrides),
      medicalReviewer: a.medicalReviewer?.name ?? null,
      publishedAt: a.publishedAt,
      updatedAt: a.updatedAt,
    });
  }
  for (const s of SYMPTOM_GUIDES) {
    const override = overrides.get(contentKey("symptom", s.slug)) ?? null;
    items.push({
      collection: "symptom",
      key: contentKey("symptom", s.slug),
      title: s.title,
      category: "Symptom guide",
      status: s.status,
      modulePublished: s.status === "PUBLISHED",
      override,
      served: isPubliclyServed(s.status, s.slug, "symptom", overrides),
      medicalReviewer: s.medicalReviewer?.name ?? null,
      publishedAt: s.publishedAt,
      updatedAt: s.updatedAt,
    });
  }
  for (const e of EQUIPMENT_GUIDES) {
    const override = overrides.get(contentKey("equipment", e.slug)) ?? null;
    items.push({
      collection: "equipment",
      key: contentKey("equipment", e.slug),
      title: e.name,
      category: "Equipment guide",
      status: e.status,
      modulePublished: e.status === "PUBLISHED",
      override,
      served: isPubliclyServed(e.status, e.slug, "equipment", overrides),
      medicalReviewer: e.medicalReviewer?.name ?? null,
      publishedAt: e.publishedAt,
      updatedAt: e.updatedAt,
    });
  }
  return items;
}
