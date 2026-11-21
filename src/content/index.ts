import { ARTICLES as ARTICLES_CORE } from "./library/articles";
import { ARTICLES_BATCH1 } from "./library/articles-batch1";
import { ARTICLES_BATCH2 } from "./library/articles-batch2";
import { SYMPTOM_GUIDES } from "./library/symptoms";
import { EQUIPMENT_GUIDES } from "./library/equipment";
import { FAQ_ITEMS } from "./faq";
import { AWARENESS_EVENTS } from "./awareness-calendar";
import {
  ARTICLE_CATEGORIES,
  type Article,
  type ArticleCategory,
  type ArticleCategorySlug,
  type ArticleSection,
  type AwarenessEvent,
  type ContentStatus,
  type EquipmentGuide,
  type FaqAudience,
  type FaqItem,
  type SymptomGuide,
} from "./types";

/**
 * Content registry — the single import surface for content APIs.
 * Publication filtering (status + admin overrides) happens server-side in
 * src/app/api/v1/content/_lib/ — never trust the client to filter.
 */

/** All library articles (core + editorial batches), single flat list. */
const ARTICLES = [...ARTICLES_CORE, ...ARTICLES_BATCH1, ...ARTICLES_BATCH2];

export * from "./types";
export { ARTICLES, SYMPTOM_GUIDES, EQUIPMENT_GUIDES, FAQ_ITEMS, AWARENESS_EVENTS };
export {
  BD_EMERGENCY_NUMBERS,
  EMERGENCY_GUIDANCE,
  type EmergencyNumber,
  type EmergencyGuidance,
} from "./emergency";

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function symptomBySlug(slug: string): SymptomGuide | undefined {
  return SYMPTOM_GUIDES.find((s) => s.slug === slug);
}

export function equipmentBySlug(slug: string): EquipmentGuide | undefined {
  return EQUIPMENT_GUIDES.find((e) => e.slug === slug);
}

export function articlesByCategory(slug: ArticleCategorySlug): Article[] {
  return ARTICLES.filter((a) => a.category === slug);
}

export function articleCategory(slug: ArticleCategorySlug): ArticleCategory {
  return ARTICLE_CATEGORIES.find((c) => c.slug === slug)!;
}

export function faqByAudience(audience: FaqAudience): FaqItem[] {
  return FAQ_ITEMS.filter((f) => f.audience === audience);
}

/** Related articles that actually exist and are published. */
export function relatedArticles(article: Article, published: Set<string>): Article[] {
  return article.relatedSlugs
    .map((slug) => articleBySlug(slug))
    .filter((a): a is Article => !!a && published.has(a.slug));
}

/** Rendered key for admin publication overrides: e.g. "article:hand-hygiene-basics". */
export function contentKey(collection: "article" | "symptom" | "equipment", slug: string): string {
  return `${collection}:${slug}`;
}

/** The standing medical disclaimer shown on every educational page. */
export const MEDICAL_DISCLAIMER =
  "This content is for general health education only. It is not medical advice, does not diagnose any condition, and does not replace assessment or treatment by a qualified healthcare professional. If you feel unwell, consult a doctor. In an emergency call 999 (Bangladesh) or your local emergency number.";

/** Months indexed 1-12 for the awareness calendar UI. */
export const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function upcomingEvents(fromMonth: number, count: number): AwarenessEvent[] {
  const sorted = [...AWARENESS_EVENTS].sort((a, b) => a.month - b.month || (a.day ?? 0) - (b.day ?? 0));
  const rotate = sorted.filter((e) => e.month >= fromMonth);
  const rest = sorted.filter((e) => e.month < fromMonth);
  return [...rotate, ...rest].slice(0, count);
}

export type { ContentStatus, ArticleSection };
