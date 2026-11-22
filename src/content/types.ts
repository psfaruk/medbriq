/**
 * Find Medi Doctor Health Library — content type contract.
 *
 * Source of truth for all educational content is the typed TS modules in
 * src/content/. Publication state can be overridden per item by admins
 * (persisted in PlatformSetting, key `content:pub:{collection}:{slug}`) —
 * see src/app/api/v1/content/_lib/publications.ts.
 *
 * WORKFLOW (enforced server-side — only PUBLISHED items are served publicly):
 *   DRAFT → EDITOR_REVIEW → MEDICAL_REVIEW → APPROVED → PUBLISHED
 *
 * HONESTY RULES for demo content:
 *   - medicalReviewer stays null until a qualified professional actually
 *     reviews the item. Never invent reviewers, credentials, ratings or dates.
 *   - Every rendered item carries the standing medical disclaimer.
 *   - Content is educational only: no diagnosis, no prescriptions, no
 *     treatment claims, no fear-based wording.
 */

export type ContentStatus =
  | "DRAFT"
  | "EDITOR_REVIEW"
  | "MEDICAL_REVIEW"
  | "APPROVED"
  | "PUBLISHED";

export const CONTENT_STATUSES: ContentStatus[] = [
  "DRAFT",
  "EDITOR_REVIEW",
  "MEDICAL_REVIEW",
  "APPROVED",
  "PUBLISHED",
];

export type ContentSource = {
  title: string;
  publisher: string;
  url: string;
};

/** Author of educational (non-clinical) copy. */
export type ContentPerson = {
  name: string;
  role: string;
};

export const CONTENT_AUTHOR: ContentPerson = {
  name: "Find Medi Doctor Health Library Team",
  role: "Health education editors",
};

export type ArticleCategorySlug =
  | "general-health"
  | "nutrition"
  | "fitness-exercise"
  | "sleep"
  | "mental-wellbeing"
  | "childrens-health"
  | "womens-health"
  | "mens-health"
  | "elderly-care"
  | "preventive-health"
  | "medical-conditions"
  | "first-aid"
  | "medical-tests";

export type ArticleCategory = {
  slug: ArticleCategorySlug;
  name: string;
  nameBn: string;
  description: string;
};

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  { slug: "general-health", name: "General Health", nameBn: "সাধারণ স্বাস্থ্য", description: "Everyday habits, hygiene and practical wellbeing basics." },
  { slug: "nutrition", name: "Nutrition", nameBn: "পুষ্টি", description: "Balanced eating, food safety and healthy dietary patterns." },
  { slug: "fitness-exercise", name: "Fitness & Exercise", nameBn: "ফিটনেস ও ব্যায়াম", description: "Moving more, safely, at every age." },
  { slug: "sleep", name: "Sleep", nameBn: "ঘুম", description: "Sleep hygiene and why rest matters for health." },
  { slug: "mental-wellbeing", name: "Mental Wellbeing", nameBn: "মানসিক সুস্থতা", description: "Stress, emotional health and where to find support." },
  { slug: "childrens-health", name: "Children's Health", nameBn: "শিশুস্বাস্থ্য", description: "Vaccination, growth and common childhood concerns." },
  { slug: "womens-health", name: "Women's Health", nameBn: "নারীস্বাস্থ্য", description: "Menstrual, antenatal and general health for women." },
  { slug: "mens-health", name: "Men's Health", nameBn: "পুরুষের স্বাস্থ্য", description: "Check-ups and healthy habits for men." },
  { slug: "elderly-care", name: "Elderly Care", nameBn: "প্রবীণ যত্ন", description: "Safety, medicines and staying independent at older ages." },
  { slug: "preventive-health", name: "Preventive Health", nameBn: "প্রতিরোধমূলক স্বাস্থ্য", description: "Screenings and check-ups that catch problems early." },
  { slug: "medical-conditions", name: "Medical Conditions", nameBn: "চিকিৎসা সম্পর্কে ধারণা", description: "Plain-language overviews of common chronic conditions." },
  { slug: "first-aid", name: "First Aid", nameBn: "প্রাথমিক চিকিৎসা", description: "Immediate steps for common injuries — and when to call for help." },
  { slug: "medical-tests", name: "Medical Tests & Reports", nameBn: "মেডিকেল পরীক্ষা", description: "What common lab tests measure and what they do not." },
];

export type ArticleSection = {
  heading: string;
  /** Plain text. Blank line (\n\n) separates paragraphs; lines starting with
   *  "• " render as bullet lists. No markdown, no HTML. */
  body: string;
};

export type Article = {
  slug: string;
  title: string;
  titleBn: string | null;
  summary: string;
  category: ArticleCategorySlug;
  /** 3-6 takeaway bullets shown in a highlighted box. */
  keyPoints: string[];
  sections: ArticleSection[];
  /** Signs that professional assessment may be appropriate (non-alarming). */
  whenToSeekHelp: string[];
  author: ContentPerson;
  /** null until a real qualified review happened — never fabricate. */
  medicalReviewer: { name: string; credentials: string } | null;
  status: ContentStatus;
  publishedAt: string; // ISO date (yyyy-mm-dd)
  updatedAt: string;
  reviewedAt: string | null;
  sources: ContentSource[];
  relatedSlugs: string[];
  /** Prominent emergency callout, shown when the topic warrants it. */
  emergencyNote: string | null;
};

export type SymptomGuide = {
  slug: string;
  title: string;
  titleBn: string | null;
  summary: string;
  /** Broad educational grouping shown as filter chips (optional). */
  category?: SymptomCategory;
  /** Library illustration path under /images/library/symptoms/ (optional). */
  image?: string | null;
  /** General, non-diagnostic meaning of the symptom. */
  whatItMeans: string;
  /** Commonly associated causes — framed as possibilities, never a diagnosis. */
  commonCauses: string[];
  /** When a professional assessment may be appropriate. */
  whenToSeekAssessment: string[];
  /** Warning signs that need URGENT medical attention. */
  redFlags: string[];
  /** Platform specialty names that may be relevant (see prisma specialties). */
  relevantSpecialties: string[];
  author: ContentPerson;
  medicalReviewer: { name: string; credentials: string } | null;
  status: ContentStatus;
  publishedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  sources: ContentSource[];
};

export type EquipmentGuide = {
  slug: string;
  name: string;
  nameBn: string | null;
  summary: string;
  /** Broad educational grouping shown as filter chips (optional). */
  category?: EquipmentCategory;
  /** Library illustration path under /images/library/equipment/ (optional). */
  image?: string | null;
  whatItIs: string;
  whatItMeasures: string;
  /** Plain-language description of the working principle (optional). */
  howItWorks?: string;
  commonUses: string[];
  /** Who generally operates the device (optional). */
  whoOperates?: string;
  /** Basic safe-use pointers. */
  safeUse: string[];
  /** What the device cannot tell you. */
  limitations: string[];
  /** Professional maintenance / calibration notes, when relevant. */
  maintenance?: string | null;
  /** Situations where professional help is needed. */
  whenProfessionalHelp: string[];
  /** Platform specialty names that use this equipment (optional). */
  relatedSpecialties?: string[];
  /** lucide icon name used by the gallery card. */
  icon: string;
  author: ContentPerson;
  medicalReviewer: { name: string; credentials: string } | null;
  status: ContentStatus;
  publishedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  sources: ContentSource[];
};

export type EquipmentCategory =
  | "Monitoring and Basic Equipment"
  | "Diagnostic and Imaging Equipment"
  | "Treatment and Life-Support Equipment";

export type SymptomCategory =
  | "General Symptoms"
  | "Respiratory and Heart Symptoms"
  | "Digestive Symptoms"
  | "Other Important Symptoms";

/** Curated gallery visual (children / family / community education). */
export type GalleryItem = {
  slug: string;
  /** Gallery grouping, e.g. "Age gallery", "Care moments", "Family", ... */
  category: string;
  caption: string;
  captionBn: string | null;
  description: string;
  ageGroup?: string | null;
  image: string;
  alt: string;
  /** Related in-library guide, when one exists. */
  related?: { view: "article" | "symptom" | "equipment-item"; slug: string } | null;
};

export type FaqAudience = "general" | "patients" | "doctors" | "hospitals";

export type FaqItem = {
  audience: FaqAudience;
  q: string;
  a: string;
};

export type AwarenessEvent = {
  /** 1-12 */
  month: number;
  /** Day of month, or null for month-long observances. */
  day: number | null;
  title: string;
  description: string;
};
