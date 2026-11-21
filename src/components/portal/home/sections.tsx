"use client";

/**
 * Homepage sections 4-17 (spec §2). Ordered composition lives in
 * home-view.tsx. Every section is self-contained and fetches its own
 * public data (or receives preloaded boot data) — graceful skeletons,
 * empty and error states included.
 */

import { useRef } from "react";
import Image from "next/image";
import {
  Stethoscope,
  Building2,
  BookOpen,
  Activity,
  Thermometer,
  Siren,
  Calculator,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  ClipboardList,
  FileCheck2,
  BadgeCheck,
  CalendarClock,
  Wallet,
  CalendarCheck2,
  ShieldCheck,
  FileQuestion,
  Clock,
  ArrowRight,
  Users,
  Star,
  Bell,
  FolderLock,
  Scale,
  Sparkles,
  CalendarHeart,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS, MONTH_NAMES, upcomingEvents } from "@/content";
import type { ArticleCategory, FaqAudience } from "@/content";
import { useT } from "@/components/app/shared/ui-kit";
import { getPreloadedBoot } from "@/lib/boot-data";
import type { DoctorCard, HospitalInfo, SpecialtyInfo } from "@/lib/types";
import {
  PortalLink,
  PortalSection,
  ViewAllLink,
  usePortalData,
  ContentIcon,
} from "../shared";
import { DoctorCard as DoctorCardComponent } from "../doctors/doctor-card";

// ── 4. Service categories ─────────────────────────────────────────────

// Rotating colorful tints (blue · teal · violet · amber · emerald · rose)
const TINTS = [
  "bg-primary-soft text-primary",
  "bg-[#13A89E]/10 text-[#0f8f87]",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-600",
];

const CATEGORIES: {
  key: string;
  icon: LucideIcon;
  view: Parameters<typeof PortalLink>[0]["view"];
  tint: string;
}[] = [
  { key: "portal.cat.doctors", icon: Stethoscope, view: { name: "doctors" }, tint: TINTS[0] },
  { key: "portal.cat.hospitals", icon: Building2, view: { name: "hospitals" }, tint: TINTS[1] },
  { key: "portal.cat.library", icon: BookOpen, view: { name: "library" }, tint: TINTS[2] },
  { key: "portal.cat.symptoms", icon: Activity, view: { name: "symptoms" }, tint: TINTS[3] },
  { key: "portal.cat.equipment", icon: Thermometer, view: { name: "equipment" }, tint: TINTS[4] },
  { key: "portal.cat.emergency", icon: Siren, view: { name: "emergency" }, tint: "bg-red-50 text-red-700" },
];

export function ServiceCategories() {
  const { t } = useT();
  return (
    <PortalSection
      id="categories"
      title={t("portal.section.popularCategories")}
      subtitle={t("portal.section.popularCategoriesSub")}
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat) => (
          <li key={cat.key}>
            <PortalLink
              view={cat.view}
              ctaLabel={`cat-${cat.key}`}
              className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${cat.tint}`}>
                <cat.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-foreground group-hover:text-primary">
                  {t(cat.key)}
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                  {t(`${cat.key}Desc`)}
                </span>
              </span>
            </PortalLink>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calculator className="h-3.5 w-3.5 text-[#13A89E]" aria-hidden="true" />
        <PortalLink view={{ name: "tools" }} className="rounded font-semibold text-primary hover:underline">
          {t("portal.footer.toolsTitle")}
        </PortalLink>
        — BMI and educational health tools.
      </p>
    </PortalSection>
  );
}

// ── 5. Featured verified doctors ──────────────────────────────────────

export function FeaturedDoctors() {
  const { t } = useT();
  // The bootstrap request already delivered the featured strip — no extra
  // request on first paint (see app.tsx / boot-data.ts).
  const preloaded = getPreloadedBoot();
  const featured: DoctorCard[] = preloaded?.homeDoctors ?? [];

  return (
    <PortalSection
      id="featured-doctors"
      tinted
      title={t("portal.section.featuredDoctors")}
      subtitle={t("portal.section.featuredDoctorsSub")}
      action={<ViewAllLink view={{ name: "doctors" }} label={t("portal.cta.viewAllDoctors")} />}
    >
      {featured.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 6).map((doctor) => (
            <DoctorCardComponent key={doctor.slug} doctor={doctor} />
          ))}
        </div>
      )}
    </PortalSection>
  );
}

// ── 6. Hospital directory preview ─────────────────────────────────────

export function HospitalsPreview() {
  const { t } = useT();
  const { data, loading, error } = usePortalData<{ items: HospitalInfo[] }>(
    "/api/v1/hospitals"
  );

  return (
    <PortalSection
      id="hospitals"
      title={t("portal.section.hospitals")}
      subtitle={t("portal.section.hospitalsSub")}
      action={<ViewAllLink view={{ name: "hospitals" }} label={t("portal.cta.viewAllHospitals")} />}
    >
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}
      {error && <SectionError message={error} />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.slice(0, 4).map((h) => (
            <PortalLink
              key={h.slug}
              view={{ name: "hospital", slug: h.slug }}
              ctaLabel="hospital-card"
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#13A89E]/10 text-[#0f8f87]">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-foreground group-hover:text-primary">
                {h.name}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {h.city}
                {h.address ? ` — ${h.address.split(",")[0]}` : ""}
              </p>
              <p className="mt-auto pt-3 text-xs font-medium text-muted-foreground">
                {h.doctorCount} {h.doctorCount === 1 ? "doctor" : "doctors"} practising
              </p>
            </PortalLink>
          ))}
        </div>
      )}
    </PortalSection>
  );
}

// ── 6.5 Care network 3D banner (wide architectural render) ───────────

export function CareNetworkBanner() {
  const { t } = useT();
  return (
    <section id="care-network" aria-labelledby="care-network-title" className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-soft">
          <div className="absolute inset-0" aria-hidden="true">
            <Image
              src="/images/banner-medical-center.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          {/* colorful gradient overlay for text contrast */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#172B4D]/90 via-[#1769AA]/60 to-[#13A89E]/25"
          />
          <div className="relative flex min-h-[26rem] flex-col justify-center gap-3 p-6 sm:min-h-[24rem] sm:gap-4 sm:p-10 lg:min-h-[26rem] lg:p-14">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("portal.hero.badge")}
            </p>
            <h2
              id="care-network-title"
              className="max-w-lg text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              Modern chambers, clinics &amp; hospitals across Bangladesh
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
              Browse verified doctors, compare chambers and book in-person visits with
              transparent fees — all before you sign in.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <PortalLink
                view={{ name: "doctors" }}
                ctaLabel="care-network-find-doctor"
                className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-bold text-[#1769AA] shadow-soft transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t("portal.hero.findDoctor")}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </PortalLink>
              <PortalLink
                view={{ name: "hospitals" }}
                ctaLabel="care-network-hospitals"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/40 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Building2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t("portal.section.hospitals")}
              </PortalLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 7. Specializations ────────────────────────────────────────────────

const SPECIALTY_TINTS = [
  "bg-primary-soft text-primary",
  "bg-[#13A89E]/10 text-[#0f8f87]",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-600",
];

export function Specializations() {
  const { t } = useT();
  const preloaded = getPreloadedBoot();
  const specialties: SpecialtyInfo[] = preloaded?.specialties ?? [];

  return (
    <PortalSection
      id="specialties"
      title={t("portal.section.specialties")}
      subtitle={t("portal.section.specialtiesSub")}
      action={<ViewAllLink view={{ name: "specialties" }} label={t("portal.cta.learnMore")} />}
    >
      {specialties.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-11 w-36 rounded-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          {specialties.map((s, i) => (
            <li key={s.slug}>
              <PortalLink
                view={{ name: "doctors", specialty: s.slug }}
                ctaLabel="specialty-chip"
                className={`inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  SPECIALTY_TINTS[i % SPECIALTY_TINTS.length]
                }`}
              >
                {s.icon && <ContentIcon name={s.icon} className="h-4 w-4" />}
                {s.name}
                <span className="text-xs font-medium opacity-70">{s.doctorCount}</span>
              </PortalLink>
            </li>
          ))}
        </ul>
      )}
    </PortalSection>
  );
}

// ── 8. Health articles + awareness days teaser ────────────────────────

type ArticleSummary = {
  slug: string;
  title: string;
  titleBn: string | null;
  summary: string;
  category: string;
  readMinutes: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  "general-health": "General Health",
  nutrition: "Nutrition",
  "fitness-exercise": "Fitness & Exercise",
  sleep: "Sleep",
  "mental-wellbeing": "Mental Wellbeing",
  "childrens-health": "Children's Health",
  "womens-health": "Women's Health",
  "mens-health": "Men's Health",
  "elderly-care": "Elderly Care",
  "preventive-health": "Preventive Health",
  "medical-conditions": "Medical Conditions",
  "first-aid": "First Aid",
  "medical-tests": "Medical Tests",
};

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug;
}

export function HealthArticles() {
  const { t } = useT();
  const { data, loading, error } = usePortalData<{ items: ArticleSummary[] }>(
    "/api/v1/content/articles"
  );
  const events = upcomingEvents(new Date().getMonth() + 1, 3);

  return (
    <PortalSection
      id="articles"
      tinted
      title={t("portal.section.articles")}
      subtitle={t("portal.section.articlesSub")}
      action={<ViewAllLink view={{ name: "library" }} label={t("portal.cta.viewAllArticles")} />}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          )}
          {error && <SectionError message={error} />}
          {data && (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.items.slice(0, 2).map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </div>

        {/* Health awareness days teaser */}
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarHeart className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
            {t("portal.section.healthDays")}
          </h3>
          <ul className="mt-4 space-y-3">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft font-bold leading-none text-primary">
                  <span className="text-xs">{MONTH_NAMES[e.month].slice(0, 3)}</span>
                  <span className="text-sm">{e.day ?? "•"}</span>
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{e.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {e.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <PortalLink
            view={{ name: "calendar" }}
            className="mt-4 inline-flex items-center gap-1 rounded text-sm font-semibold text-primary hover:underline"
          >
            {t("portal.footer.calendarTitle")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </PortalLink>
        </aside>
      </div>
    </PortalSection>
  );
}

export function ArticleCard({ article }: { article: ArticleSummary }) {
  const { t, lang } = useT();
  const title = lang === "bn" && article.titleBn ? article.titleBn : article.title;
  return (
    <PortalLink
      view={{ name: "article", slug: article.slug }}
      ctaLabel="article-card"
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#0f8f87]">
        {categoryLabel(article.category)}
      </p>
      <h3 className="mt-2 text-base font-bold leading-snug text-foreground group-hover:text-primary">
        {title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {article.summary}
      </p>
      <p className="mt-auto pt-3 text-xs font-medium text-muted-foreground">
        {t("portal.library.readTime", { minutes: article.readMinutes })}
      </p>
    </PortalLink>
  );
}

// ── 9. Symptoms slider ────────────────────────────────────────────────

type SymptomSummary = { slug: string; title: string; titleBn: string | null; summary: string };

export function SymptomsSlider() {
  const { t, lang } = useT();
  const scroller = useRef<HTMLUListElement>(null);
  const { data, loading, error } = usePortalData<{ items: SymptomSummary[] }>(
    "/api/v1/content/symptoms"
  );

  function scrollBy(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  return (
    <PortalSection
      id="symptoms"
      title={t("portal.section.symptoms")}
      subtitle={t("portal.section.symptomsSub")}
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Scroll symptom guides left"
            onClick={() => scrollBy(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Scroll symptom guides right"
            onClick={() => scrollBy(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      }
    >
      {loading && (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-64 shrink-0 rounded-2xl" />
          ))}
        </div>
      )}
      {error && <SectionError message={error} />}
      {data && (
        <>
          <ul
            ref={scroller}
            className="flex list-none gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
            aria-label={t("portal.section.symptoms")}
          >
            {data.items.map((s) => (
              <li key={s.slug} className="w-64 shrink-0 sm:w-72">
                <PortalLink
                  view={{ name: "symptom", slug: s.slug }}
                  ctaLabel="symptom-card"
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#13A89E]/10 text-[#0f8f87]">
                    <Activity className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-foreground">
                    {lang === "bn" && s.titleBn ? s.titleBn : s.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {s.summary}
                  </p>
                  <span className="mt-auto pt-3 text-xs font-semibold text-primary">
                    {t("portal.cta.readMore")} →
                  </span>
                </PortalLink>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            <strong>Note:</strong> these guides explain symptoms in general terms — they
            cannot tell you what illness you have.
          </p>
        </>
      )}
    </PortalSection>
  );
}

// ── 10. Equipment gallery ─────────────────────────────────────────────

type EquipmentSummary = { slug: string; name: string; nameBn: string | null; summary: string; icon: string };

export function EquipmentGallery() {
  const { t, lang } = useT();
  const { data, loading, error } = usePortalData<{ items: EquipmentSummary[] }>(
    "/api/v1/content/equipment"
  );

  return (
    <PortalSection
      id="equipment"
      title={t("portal.section.equipment")}
      subtitle={t("portal.section.equipmentSub")}
      action={<ViewAllLink view={{ name: "equipment" }} label={t("portal.cta.viewAllEquipment")} />}
    >
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
      {error && <SectionError message={error} />}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.slice(0, 9).map((e, i) => (
            <PortalLink
              key={e.slug}
              view={{ name: "equipment-item", slug: e.slug }}
              ctaLabel="equipment-card"
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TINTS[i % TINTS.length]}`}>
                <ContentIcon name={e.icon} className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold leading-snug text-foreground group-hover:text-primary sm:text-sm">
                {lang === "bn" && e.nameBn ? e.nameBn : e.name}
              </span>
            </PortalLink>
          ))}
        </div>
      )}
    </PortalSection>
  );
}

// ── 11. How booking works ─────────────────────────────────────────────

const BOOKING_STEPS: { icon: LucideIcon; key: string }[] = [
  { icon: Search, key: "Find a doctor" },
  { icon: UserCheck, key: "Review qualifications & chamber" },
  { icon: CalendarClock, key: "Select an appointment slot" },
  { icon: FileCheck2, key: "Sign in or create an account" },
  { icon: Wallet, key: "See your automatically calculated fee" },
  { icon: CalendarCheck2, key: "Confirm the booking" },
  { icon: Stethoscope, key: "Attend your appointment" },
];

// Colorful step number chips — blue · teal · emerald · amber · rose · violet · sky
const STEP_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-[#13A89E] text-white",
  "bg-emerald-600 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-violet-600 text-white",
  "bg-sky-600 text-white",
];

export function HowBookingWorks({ compact }: { compact?: boolean }) {
  const { t } = useT();
  return (
    <PortalSection
      id="how-booking"
      tinted={!compact}
      title={t("portal.section.bookingSteps")}
      subtitle={t("portal.section.bookingStepsSub")}
      action={
        <ViewAllLink view={{ name: "how-it-works" }} label={t("portal.footer.howTitle")} />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
        {/* 3D feature wall art */}
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-soft">
          <Image
            src="/images/feature-3d-icons.png"
            alt="3D illustration of a stethoscope, health shield and heartbeat monitor"
            width={1344}
            height={768}
            sizes="(min-width: 1024px) 30rem, 100vw"
            className="h-48 w-full object-cover sm:h-56 lg:h-full"
          />
        </div>
        <ol className="grid gap-4 sm:grid-cols-2">
          {BOOKING_STEPS.map((step, i) => (
            <li
              key={step.key}
              className="relative flex gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${STEP_COLORS[i % STEP_COLORS.length]}`}
              >
                {i + 1}
              </span>
              <span className="pt-1">
                <step.icon className="mb-1.5 h-4 w-4 text-[#13A89E]" aria-hidden="true" />
                <span className="block text-sm font-semibold leading-snug text-foreground">
                  {step.key}
                </span>
              </span>
            </li>
          ))}
          <li className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-4">
            <PortalLink
              view={{ name: "doctors" }}
              ctaLabel="how-booking-cta"
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-bold text-primary hover:underline"
            >
              {t("portal.cta.getStarted")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PortalLink>
          </li>
        </ol>
      </div>
    </PortalSection>
  );
}

// ── 12. Online consultation (honest: disabled) ────────────────────────

export function OnlineConsultation() {
  const { t } = useT();
  return (
    <PortalSection
      id="telehealth"
      title={t("portal.section.telehealth")}
      subtitle={t("portal.section.telehealthSub")}
    >
      <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:p-8">
        <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-border sm:w-72">
          <Image
            src="/images/telehealth-3d.png"
            alt="3D illustration of a video consultation between a doctor and a patient"
            width={1344}
            height={768}
            sizes="(min-width: 640px) 18rem, 100vw"
            className="h-40 w-full object-cover sm:h-44"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-foreground">
            Video consultations — coming after compliance review
          </h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Telehealth is a regulated service in Bangladesh. MedBricBD keeps video
            consultations switched off until the required regulatory and clinical
            review is complete. Today, all bookings are in-person visits at the
            doctor&apos;s chamber — with transparent fees shown before you confirm.
          </p>
        </div>
        <BadgeNotice>Honest by design</BadgeNotice>
      </div>
    </PortalSection>
  );
}

function BadgeNotice({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#13A89E]/30 bg-[#13A89E]/10 px-3 py-1 text-xs font-semibold text-[#0f8f87]">
      {children}
    </span>
  );
}

// ── 13 + 14. For doctors / For hospitals CTA bands ────────────────────

export function ForDoctorsBand() {
  const { t } = useT();
  return (
    <CtaBand
      id="for-doctors"
      icon={Stethoscope}
      title={t("portal.section.forDoctors")}
      subtitle={t("portal.section.forDoctorsSub")}
      bullets={[
        "Your own new/returning patient fee structure",
        "Automatic patient classification (new / returning / follow-up)",
        "Chamber, schedule and appointment management",
        "Free listing during the demo phase",
      ]}
      cta={{ label: t("portal.cta.joinAsDoctor"), view: { name: "for-doctors" } }}
      image={{ src: "/images/cta-doctors-3d.png", alt: "3D render of a Bangladeshi doctor with a holographic appointment schedule" }}
      ctaClassName="bg-[#13A89E] text-white hover:bg-[#0f8f87] focus-visible:outline-[#13A89E]"
      chipClassName="bg-[#13A89E]/10 text-[#0f8f87]"
    />
  );
}

export function ForHospitalsBand() {
  const { t } = useT();
  return (
    <CtaBand
      id="for-hospitals"
      icon={Building2}
      title={t("portal.section.forHospitals")}
      subtitle={t("portal.section.forHospitalsSub")}
      bullets={[
        "Public hospital profile with verification badge",
        "Branches and departments management",
        "Directory of doctors practising at your institution",
        "Appointment and schedule oversight",
      ]}
      cta={{ label: t("portal.cta.joinAsHospital"), view: { name: "for-hospitals" } }}
      image={{ src: "/images/cta-hospitals-3d.png", alt: "Isometric 3D render of a modern hospital building" }}
      ctaClassName="bg-primary text-primary-foreground hover:bg-primary/90"
      chipClassName="bg-primary-soft text-primary"
      tinted
    />
  );
}

function CtaBand({
  id,
  icon: Icon,
  title,
  subtitle,
  bullets,
  cta,
  tinted,
  image,
  ctaClassName,
  chipClassName,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  bullets: string[];
  cta: { label: string; view: Parameters<typeof PortalLink>[0]["view"] };
  tinted?: boolean;
  image?: { src: string; alt: string };
  ctaClassName?: string;
  chipClassName?: string;
}) {
  return (
    <PortalSection id={id} tinted={tinted} title={title} subtitle={subtitle}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        {/* 3D illustration panel */}
        {image && (
          <div className="relative m-1 overflow-hidden rounded-3xl border border-border shadow-soft">
            <Image
              src={image.src}
              alt={image.alt}
              width={1344}
              height={768}
              sizes="(min-width: 1024px) 32rem, 100vw"
              className="h-48 w-full object-cover sm:h-60 lg:h-[calc(100%-0.5rem)]"
            />
          </div>
        )}
        <div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {bullets.map((b) => (
              <div
                key={b}
                className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${chipClassName ?? "bg-primary-soft text-primary"}`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium leading-snug text-foreground">{b}</p>
              </div>
            ))}
          </ul>
          <PortalLink
            view={cta.view}
            ctaLabel={`band-${id}`}
            className={`mt-4 flex w-full items-center justify-center rounded-2xl p-4 text-center text-sm font-bold shadow-soft transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              ctaClassName ?? "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary"
            }`}
          >
            {cta.label}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </PortalLink>
        </div>
      </div>
    </PortalSection>
  );
}

// ── 15. Patient benefits ──────────────────────────────────────────────

const BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BadgeCheck,
    title: "Verified doctors only",
    desc: "Credentials reviewed through our verification process — with an honest Pending label until then.",
  },
  {
    icon: Scale,
    title: "Transparent fees",
    desc: "New and returning patient fees are shown before you book, calculated automatically and re-checked server-side.",
  },
  {
    icon: Sparkles,
    title: "Free to browse",
    desc: "Search doctors, hospitals and health education without an account. Sign in only to book.",
  },
  {
    icon: Bell,
    title: "Stay informed",
    desc: "Booking confirmations, status changes and reminders in your notification center.",
  },
  {
    icon: FolderLock,
    title: "Private by design",
    desc: "Public profiles are separate from personal medical records; private data is never listed publicly.",
  },
  {
    icon: BookOpen,
    title: "Honest health education",
    desc: "Plain-language guides with sources and medical disclaimers — never fear-based clickbait.",
  },
];

export function PatientBenefits() {
  const { t } = useT();
  return (
    <PortalSection
      id="benefits"
      title={t("portal.section.benefits")}
      subtitle={t("portal.section.benefitsSub")}
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b, i) => (
          <li
            key={b.title}
            className="flex gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINTS[i % TINTS.length]}`}>
              <b.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </PortalSection>
  );
}

// ── 16. Trust, verification & safety ──────────────────────────────────

const TRUST_STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: FileCheck2,
    title: "1. Credential submission",
    desc: "Doctors submit registration number, qualifications and practice details when they join.",
  },
  {
    icon: ClipboardList,
    title: "2. Review",
    desc: "The platform team reviews submitted credentials against the provided registration details.",
  },
  {
    icon: ShieldCheck,
    title: "3. Verified badge",
    desc: "Verified profiles receive the badge. Pending profiles are labeled honestly — never as verified.",
  },
  {
    icon: Users,
    title: "4. Ongoing honesty",
    desc: "Reviews come from real patients with completed visits. Anything unverified is labeled as such.",
  },
];

export function TrustSection() {
  const { t } = useT();
  const preloaded = getPreloadedBoot();
  const featured: DoctorCard[] = preloaded?.homeDoctors ?? [];
  const ratingCount = featured.reduce((sum, d) => sum + d.ratingCount, 0);

  return (
    <PortalSection
      id="trust"
      tinted
      title={t("portal.section.trust")}
      subtitle={t("portal.section.trustSub")}
      action={<ViewAllLink view={{ name: "verification" }} label={t("portal.footer.verifyTitle")} />}
    >
      <div className="grid gap-6 lg:grid-cols-[0.62fr_1.38fr] lg:items-stretch">
        {/* 3D verification shield art */}
        <div className="relative m-1 overflow-hidden rounded-3xl border border-border shadow-soft">
          <Image
            src="/images/trust-shield-3d.png"
            alt="3D render of a medical verification shield with a checkmark"
            width={1024}
            height={1024}
            sizes="(min-width: 1024px) 22rem, 100vw"
            className="h-48 w-full object-cover sm:h-64 lg:h-[calc(100%-0.5rem)]"
          />
        </div>
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TRUST_STEPS.map((s, i) => (
              <div
                key={s.title}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TINTS[i % TINTS.length]}`}>
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#13A89E]" aria-hidden="true" />
              Verification statuses shown on every profile
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {ratingCount}+ patient reviews across the demo dataset
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Medical content carries review dates and disclaimers
            </span>
          </p>
        </div>
      </div>
    </PortalSection>
  );
}

// ── 17. FAQ ───────────────────────────────────────────────────────────

export function HomeFaq() {
  const { t } = useT();
  const general = FAQ_ITEMS.filter((f) => f.audience === ("general" as FaqAudience)).slice(0, 6);
  return (
    <PortalSection
      id="faq"
      title={t("portal.section.faq")}
      subtitle={t("portal.section.faqSub")}
      action={<ViewAllLink view={{ name: "faq" }} label={t("portal.cta.learnMore")} />}
    >
      <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5 shadow-soft">
        {general.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border last:border-0">
            <AccordionTrigger className="py-4 text-left text-sm font-bold text-foreground hover:no-underline sm:text-base">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PortalSection>
  );
}

// ── shared bits ───────────────────────────────────────────────────────

function SectionError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <FileQuestion className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {message}
      </CardContent>
    </Card>
  );
}

export type { ArticleSummary, SymptomSummary, EquipmentSummary };
export type ArticleCategorySlug = ArticleCategory["slug"];
