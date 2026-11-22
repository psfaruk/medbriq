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
import { CinematicVideo, Reveal } from "./cinematic";

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

const EXPLORE_CARDS: {
  key: string;
  sub: string;
  view: Parameters<typeof PortalLink>[0]["view"];
  image: string;
  alt: string;
}[] = [
  {
    key: "Medical Equipment",
    sub: "\u09e9\u09e6\u099f\u09bf \u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09bf\u09a4\u09bf",
    view: { name: "equipment" },
    image: "/images/library/equipment/ultrasound-machine.png",
    alt: "",
  },
  {
    key: "Symptoms Guide",
    sub: "\u09e9\u09e6\u099f\u09bf \u09b2\u0995\u09cd\u09b7\u09a3",
    view: { name: "symptoms" },
    image: "/images/library/symptoms/fever.png",
    alt: "",
  },
  {
    key: "Family Healthcare",
    sub: "\u09aa\u09b0\u09bf\u09ac\u09be\u09b0\u09c7\u09b0 \u09b8\u09cd\u09ac\u09be\u09b8\u09cd\u09a5\u09cd\u09af\u09b6\u09bf\u0995\u09cd\u09b7\u09be",
    view: { name: "family-health" },
    image: "/images/library/family/nuclear-family.png",
    alt: "",
  },
  {
    key: "Children's Health",
    sub: "\u09b6\u09bf\u09b6\u09c1\u09a6\u09c7\u09b0 \u09b8\u09cd\u09ac\u09be\u09b8\u09cd\u09a5\u09cd\u09af",
    view: { name: "childrens-health" },
    image: "/images/library/children/pediatric-doctor-exam.png",
    alt: "",
  },
];

export function ServiceCategories() {
  const { t } = useT();
  return (
    <PortalSection
      id="categories"
      eyebrow="Start here"
      title="Explore Healthcare"
      subtitle="Educational guides, galleries and directories — free for everyone, no sign-in needed."
    >
      {/* Education hubs (image-led) */}
      <Reveal as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EXPLORE_CARDS.map((card) => (
          <li key={card.key}>
            <PortalLink
              view={card.view}
              ctaLabel={`explore-${card.key}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="relative block aspect-[16/10] w-full overflow-hidden bg-accent">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  sizes="(min-width: 1024px) 16rem, (min-width: 640px) 45vw, 92vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <span className="flex flex-1 items-start gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground group-hover:text-primary">
                    {card.key}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-[#0f8f87]">
                    {card.sub}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </span>
            </PortalLink>
          </li>
        ))}
      </Reveal>

      {/* Healthcare directory quick links */}
      <Reveal as="nav" delay={0.08}
        aria-label="Healthcare directory"
        className="mt-4 flex flex-wrap gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-soft"
      >
        {[
          { label: "Find Doctors", view: { name: "doctors" } as const, icon: Stethoscope },
          { label: "Find Hospitals", view: { name: "hospitals" } as const, icon: Building2 },
          { label: "Medical Specialties", view: { name: "specialties" } as const, icon: Activity },
          { label: "Health Library", view: { name: "library" } as const, icon: BookOpen },
          { label: "Emergency Guide", view: { name: "emergency" } as const, icon: Siren },
          { label: "Health Tools", view: { name: "tools" } as const, icon: Calculator },
        ].map((link) => (
          <PortalLink
            key={link.label}
            view={link.view}
            ctaLabel="directory-quicklink"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <link.icon className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
            {link.label}
          </PortalLink>
        ))}
      </Reveal>
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
      eyebrow="Verified network"
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
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 6).map((doctor) => (
            <DoctorCardComponent key={doctor.slug} doctor={doctor} />
          ))}
        </Reveal>
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
      eyebrow="Care near you"
      title={t("portal.section.hospitals")}
      subtitle={t("portal.section.hospitalsSub")}
      action={<ViewAllLink view={{ name: "hospitals" }} label={t("portal.cta.viewAllHospitals")} />}
    >
      {/* Cinematic hospital scene strip (static — keeps the data cards clean) */}
      <Reveal className="group relative mb-6 h-32 overflow-hidden rounded-3xl border border-border shadow-soft sm:h-44">
        <Image
          src="/images/cinematic/scene-hospital.jpg"
          alt="Cinematic view of a modern hospital building"
          fill
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-[#0f8f87]/25"
        />
        <p className="absolute bottom-4 left-5 right-5 max-w-md text-sm font-bold leading-snug text-white sm:text-base">
          From district clinics to Dhaka teaching hospitals — explore them before you book.
        </p>
      </Reveal>
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}
      {error && <SectionError message={error} />}
      {data && (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </Reveal>
      )}
    </PortalSection>
  );
}

// ── 6.5 Care network cinematic video banner (full-bleed) ──────────────

export function CareNetworkBanner() {
  const { t } = useT();
  return (
    <section
      id="care-network"
      aria-labelledby="care-network-title"
      className="relative isolate overflow-hidden bg-black text-white"
    >
      {/* Full-bleed looping cinematic video background */}
      <div className="absolute inset-0" aria-hidden="true">
        <CinematicVideo
          src="/videos/banner-cinematic.mp4"
          poster="/images/cinematic/scene-care-network.jpg"
          overlayClassName="bg-gradient-to-r from-black/85 via-[#0f8f87]/40 to-black/25"
        />
        {/* base dim + letterbox vignettes keep white text WCAG-AA safe on any frame */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-center gap-3 px-4 py-16 sm:gap-4 sm:px-6 sm:py-20 lg:py-24">
        <Reveal>
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#8be0d7]" aria-hidden="true" />
            {t("portal.hero.badge")}
          </p>
          <h2
            id="care-network-title"
            className="mt-4 max-w-lg text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
          >
            Modern chambers, clinics &amp; hospitals across Bangladesh
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
            Browse verified doctors, compare chambers and book in-person visits with
            transparent fees — all before you sign in.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PortalLink
              view={{ name: "doctors" }}
              ctaLabel="care-network-find-doctor"
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-bold text-[#0f8f87] shadow-soft transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t("portal.hero.findDoctor")}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </PortalLink>
            <PortalLink
              view={{ name: "hospitals" }}
              ctaLabel="care-network-hospitals"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/50 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Building2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("portal.section.hospitals")}
            </PortalLink>
          </div>
        </Reveal>
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
      eyebrow="Find your specialist"
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
        <Reveal as="ul" className="flex flex-wrap gap-2.5">
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
        </Reveal>
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
      eyebrow="Health library"
      title={t("portal.section.articles")}
      subtitle={t("portal.section.articlesSub")}
      action={<ViewAllLink view={{ name: "library" }} label={t("portal.cta.viewAllArticles")} />}
    >
      {/* Cinematic education still — elegant static treatment (rounded, gradient, hover scale) */}
      <Reveal className="group relative mb-6 h-36 overflow-hidden rounded-3xl border border-border shadow-soft sm:h-48">
        <Image
          src="/images/cinematic/cta-education.jpg"
          alt="Cinematic scene of a patient reading trusted health education material"
          fill
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-[#0f8f87]/25"
        />
        <p className="absolute bottom-4 left-5 right-5 max-w-lg text-sm font-bold leading-snug text-white sm:text-base">
          Plain-language guides, reviewed for accuracy — free for everyone, no sign-in needed.
        </p>
      </Reveal>
      <Reveal className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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
      </Reveal>
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

type SymptomSummary = { slug: string; title: string; titleBn: string | null; summary: string; image: string | null };

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
      eyebrow="Understand your symptoms"
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
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {s.image ? (
                    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-accent">
                      <Image
                        src={s.image}
                        alt=""
                        fill
                        sizes="18rem"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#13A89E]/10 text-[#0f8f87]">
                      <Activity className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-5">
                    <h3 className="text-sm font-bold text-foreground">
                      {lang === "bn" && s.titleBn ? s.titleBn : s.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {s.summary}
                    </p>
                    <span className="mt-auto pt-3 text-xs font-semibold text-primary">
                      {t("portal.cta.readMore")} →
                    </span>
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

type EquipmentSummary = { slug: string; name: string; nameBn: string | null; summary: string; icon: string; image: string | null };

export function EquipmentGallery() {
  const { t, lang } = useT();
  const { data, loading, error } = usePortalData<{ items: EquipmentSummary[] }>(
    "/api/v1/content/equipment"
  );

  return (
    <PortalSection
      id="equipment"
      eyebrow="Medical technology"
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
        <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.items.slice(0, 10).map((e, i) => (
            <PortalLink
              key={e.slug}
              view={{ name: "equipment-item", slug: e.slug }}
              ctaLabel="equipment-card"
              className="group flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-border bg-card text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {e.image ? (
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-primary-soft">
                  <Image
                    src={e.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 12rem, 45vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <ContentIcon name={e.icon} className="h-6 w-6" />
                </span>
              )}
              <span className="px-3 pb-4 text-xs font-bold leading-snug text-foreground group-hover:text-primary sm:text-sm">
                {lang === "bn" && e.nameBn ? e.nameBn : e.name}
              </span>
            </PortalLink>
          ))}
        </Reveal>
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

// Colorful step number chips — teal · emerald · amber · rose · violet
const STEP_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-[#13A89E] text-white",
  "bg-emerald-600 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-violet-600 text-white",
  "bg-[#0f8f87] text-white",
];

export function HowBookingWorks({ compact }: { compact?: boolean }) {
  const { t } = useT();
  return (
    <PortalSection
      id="how-booking"
      tinted={!compact}
      eyebrow="Step by step"
      title={t("portal.section.bookingSteps")}
      subtitle={t("portal.section.bookingStepsSub")}
      action={
        <ViewAllLink view={{ name: "how-it-works" }} label={t("portal.footer.howTitle")} />
      }
    >
      <Reveal className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
        {/* Cinematic consultation still — framed, gradient overlay, hover scale */}
        <div className="group relative m-1 h-48 overflow-hidden rounded-3xl border border-border shadow-soft sm:h-56 lg:h-[calc(100%-0.5rem)]">
          <Image
            src="/images/cinematic/scene-consultation.jpg"
            alt="Cinematic scene of a doctor consulting a patient"
            fill
            sizes="(min-width: 1024px) 30rem, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />
          <p className="absolute bottom-4 left-5 right-5 text-sm font-bold leading-snug text-white sm:text-base">
            From first search to confirmed visit
          </p>
        </div>
        <Reveal as="ol" className="grid gap-4 sm:grid-cols-2" delay={0.08}>
          {BOOKING_STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step.key}
              delay={i * 0.05}
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
            </Reveal>
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
        </Reveal>
      </Reveal>
    </PortalSection>
  );
}

// ── 12. Online consultation (honest: disabled) ────────────────────────

export function OnlineConsultation() {
  const { t } = useT();
  return (
    <PortalSection
      id="telehealth"
      eyebrow="Telehealth"
      title={t("portal.section.telehealth")}
      subtitle={t("portal.section.telehealthSub")}
    >
      {/* Stacked on mobile, side-by-side from lg — cinematic telehealth video on the left */}
      <Reveal className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-soft lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="relative h-52 overflow-hidden sm:h-60 lg:h-auto lg:min-h-[19rem]">
          <CinematicVideo
            src="/videos/scene-telehealth.mp4"
            poster="/images/cinematic/scene-telehealth.jpg"
            overlayClassName="bg-gradient-to-t from-black/90 via-black/40 to-transparent"
          />
          <span className="sr-only">
            Cinematic illustration of a future video consultation between a doctor and a patient
          </span>
          <p className="absolute bottom-4 left-5 right-5 text-xs font-semibold uppercase tracking-widest text-white">
            Illustrative preview — not yet available
          </p>
        </div>
        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <h3 className="text-base font-bold text-foreground">
            Video consultations — coming after compliance review
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Telehealth is a regulated service in Bangladesh. Find Medi Doctor keeps video
            consultations switched off until the required regulatory and clinical
            review is complete. Today, all bookings are in-person visits at the
            doctor&apos;s chamber — with transparent fees shown before you confirm.
          </p>
          <div className="mt-auto">
            <BadgeNotice>Honest by design</BadgeNotice>
          </div>
        </div>
      </Reveal>
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
      eyebrow="For providers"
      icon={Stethoscope}
      title={t("portal.section.forDoctors")}
      subtitle={t("portal.section.forDoctorsSub")}
      bullets={[
        "Your own new/returning patient fee structure",
        "Automatic patient classification (new / returning / follow-up)",
        "Chamber, schedule and appointment management",
        "Free listing while you verify your credentials",
      ]}
      cta={{ label: t("portal.cta.joinAsDoctor"), view: { name: "for-doctors" } }}
      video={{
        src: "/videos/cta-doctors.mp4",
        poster: "/images/cinematic/cta-doctors.jpg",
        label: "Cinematic scene of a doctor reviewing patient appointments",
      }}
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
      eyebrow="For institutions"
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
      video={{
        src: "/videos/cta-hospitals.mp4",
        poster: "/images/cinematic/cta-hospitals.jpg",
        label: "Cinematic scene of a modern hospital building and staff",
      }}
      ctaClassName="bg-primary text-primary-foreground hover:bg-primary/90"
      chipClassName="bg-primary-soft text-primary"
      tinted
    />
  );
}

function CtaBand({
  id,
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  bullets,
  cta,
  tinted,
  video,
  image,
  ctaClassName,
  chipClassName,
}: {
  id: string;
  eyebrow?: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  bullets: string[];
  cta: { label: string; view: Parameters<typeof PortalLink>[0]["view"] };
  tinted?: boolean;
  /** Cinematic looping video panel (preferred over a static image). */
  video?: { src: string; poster: string; label: string };
  image?: { src: string; alt: string };
  ctaClassName?: string;
  chipClassName?: string;
}) {
  return (
    <PortalSection id={id} eyebrow={eyebrow} tinted={tinted} title={title} subtitle={subtitle}>
      <Reveal className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        {/* Cinematic video panel (or 3D illustration fallback) */}
        {video ? (
          <div className="relative m-1 h-48 overflow-hidden rounded-3xl border border-border shadow-soft sm:h-60 lg:h-[calc(100%-0.5rem)]">
            <CinematicVideo
              src={video.src}
              poster={video.poster}
              overlayClassName="bg-gradient-to-t from-black/50 via-transparent to-transparent"
            />
            <span className="sr-only">{video.label}</span>
          </div>
        ) : (
          image && (
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
          )
        )}
        <div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {bullets.map((b, i) => (
              <Reveal
                as="li"
                key={b}
                delay={i * 0.05}
                className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${chipClassName ?? "bg-primary-soft text-primary"}`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium leading-snug text-foreground">{b}</p>
              </Reveal>
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
      </Reveal>
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
      eyebrow="Patient-first"
      title={t("portal.section.benefits")}
      subtitle={t("portal.section.benefitsSub")}
    >
      {/* Cinematic care-network still — elegant static treatment */}
      <Reveal className="group relative mb-6 h-36 overflow-hidden rounded-3xl border border-border shadow-soft sm:h-48">
        <Image
          src="/images/cinematic/scene-care-network.jpg"
          alt="Cinematic wide shot of a connected hospital care network"
          fill
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-[#0f8f87]/25"
        />
        <p className="absolute bottom-4 left-5 right-5 max-w-lg text-sm font-bold leading-snug text-white sm:text-base">
          A connected network of chambers, clinics and hospitals — built around what is
          best for patients.
        </p>
      </Reveal>
      <Reveal as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b, i) => (
          <Reveal
            as="li"
            key={b.title}
            delay={i * 0.05}
            className="flex gap-3.5 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINTS[i % TINTS.length]}`}>
              <b.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          </Reveal>
        ))}
      </Reveal>
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
      eyebrow="Safety first"
      title={t("portal.section.trust")}
      subtitle={t("portal.section.trustSub")}
      action={<ViewAllLink view={{ name: "verification" }} label={t("portal.footer.verifyTitle")} />}
    >
      <Reveal className="grid gap-6 lg:grid-cols-[0.62fr_1.38fr] lg:items-stretch">
        {/* Cinematic surgical-care video panel — trust & quality vibe */}
        <div className="relative m-1 h-56 overflow-hidden rounded-3xl border border-border shadow-soft sm:h-64 lg:h-[calc(100%-0.5rem)]">
          <CinematicVideo
            src="/videos/scene-surgery.mp4"
            poster="/images/cinematic/scene-surgery.jpg"
            overlayClassName="bg-gradient-to-t from-black/90 via-black/50 to-black/5"
          />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8be0d7]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Verified care
            </p>
            <p className="mt-1.5 text-sm font-bold leading-snug text-white sm:text-base">
              Every credential checked before your visit
            </p>
          </div>
        </div>
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TRUST_STEPS.map((s, i) => (
              <Reveal
                as="div"
                key={s.title}
                delay={i * 0.05}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TINTS[i % TINTS.length]}`}>
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#13A89E]" aria-hidden="true" />
              Verification statuses shown on every profile
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {ratingCount}+ patient reviews across the platform
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Medical content carries review dates and disclaimers
            </span>
          </p>
        </div>
      </Reveal>
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
      eyebrow="Questions"
      title={t("portal.section.faq")}
      subtitle={t("portal.section.faqSub")}
      action={<ViewAllLink view={{ name: "faq" }} label={t("portal.cta.learnMore")} />}
    >
      <Reveal>
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
      </Reveal>
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
