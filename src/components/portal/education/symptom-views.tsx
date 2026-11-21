"use client";

/**
 * Symptom education (spec §7): non-diagnostic guides. The home is a card
 * grid; the detail explains meaning, common possibilities, when assessment
 * may help, urgent red flags and relevant specialties — with the standing
 * education notice. Never a diagnosis.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Activity, ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { SymptomGuide } from "@/content";
import { useT, EmptyState, ErrorState, DemoNotice } from "@/components/app/shared/ui-kit";
import { useAppStore } from "@/lib/app-state";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  Breadcrumbs,
  EducationNotice,
  MedicalDisclaimerBox,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";

type ListResponse = { items: { slug: string; title: string; titleBn: string | null; summary: string; category: string | null; image: string | null }[]; disclaimer: string };
type DetailResponse = { guide: SymptomGuide; disclaimer: string };

const SYMPTOM_CATEGORIES = [
  "General Symptoms",
  "Respiratory and Heart Symptoms",
  "Digestive Symptoms",
  "Other Important Symptoms",
] as const;

function categoryShort(name: string): string {
  return name
    .replace("Respiratory and Heart Symptoms", "Respiratory & Heart")
    .replace("Digestive Symptoms", "Digestive")
    .replace("Other Important Symptoms", "Other Symptoms")
    .replace("General Symptoms", "General");
}

export function SymptomsHomeView() {
  const { t, lang } = useT();
  useTrackPageView("symptoms");
  const [category, setCategory] = useState<string | null>(null);
  const { data, loading, error, reload } = usePortalData<ListResponse>(
    "/api/v1/content/symptoms"
  );

  const items = useMemo(
    () => (data ? data.items.filter((s) => !category || s.category === category) : []),
    [data, category]
  );

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          { label: t("portal.library.symptomsHub") },
        ]}
      />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.library.symptomsHub")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("portal.library.symptomsHubDesc")}
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <EducationNotice>
          These guides explain common symptoms in general terms. They cannot
          determine what illness you have, and they never replace a doctor&apos;s
          assessment. In an emergency call 999.
        </EducationNotice>
        <DemoNotice>
          Demo content — every guide requires qualified medical review before
          real public launch. Review status is shown per guide.
        </DemoNotice>
      </div>

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<Activity className="h-6 w-6" />} title="No symptom guides published yet." />
      )}
      {data && data.items.length > 0 && (
        <>
          {/* Category filter chips */}
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <button
              type="button"
              onClick={() => setCategory(null)}
              aria-pressed={category === null}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                category === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              All ({data.items.length})
            </button>
            {SYMPTOM_CATEGORIES.map((c) => {
              const count = data.items.filter((s) => s.category === c).length;
              if (count === 0) return null;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? null : c)}
                  aria-pressed={category === c}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {categoryShort(c)} ({count})
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <PortalLink
                key={s.slug}
                view={{ name: "symptom", slug: s.slug }}
                ctaLabel="symptom-card"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {s.image ? (
                  <span className="relative block aspect-[4/3] w-full overflow-hidden bg-accent">
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#13A89E]/10 text-[#0f8f87]">
                    <Activity className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
                <span className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-bold text-foreground group-hover:text-primary">
                    {lang === "bn" && s.titleBn ? s.titleBn : s.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {s.summary}
                  </p>
                  <span className="mt-auto pt-3 text-sm font-semibold text-primary">
                    {t("portal.cta.readMore")} →
                  </span>
                </span>
              </PortalLink>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export function SymptomDetailView({ slug }: { slug: string }) {
  const { t, lang } = useT();
  useTrackPageView("symptom");
  const setPortalView = useAppStore((s) => s.setPortalView);
  const { data, loading, error, reload } = usePortalData<DetailResponse>(
    `/api/v1/content/symptoms?slug=${encodeURIComponent(slug)}`
  );

  const guide = data?.guide ?? null;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          { label: t("portal.library.symptomsHub"), view: { name: "symptoms" } },
          { label: guide?.title ?? "…" },
        ]}
      />

      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && !data && (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="Symptom guide not found"
          action={
            <PortalLink view={{ name: "symptoms" }}>
              <Button size="sm" variant="outline">
                {t("portal.cta.viewAllSymptoms")}
              </Button>
            </PortalLink>
          }
        />
      )}

      {guide && data && (
        <article>
          {guide.image && (
            <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-accent shadow-soft">
              <Image
                src={guide.image}
                alt=""
                fill
                sizes="(min-width: 768px) 48rem, 100vw"
                className="object-cover"
              />
              <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                AI-generated educational illustration
              </span>
            </div>
          )}
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
            {lang === "bn" && guide.titleBn ? guide.titleBn : guide.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{guide.summary}</p>

          <div className="mt-5 space-y-3">
            <EducationNotice />
            <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-center text-xs font-semibold text-amber-800">
              {t("portal.library.reviewStatus")}
            </p>
          </div>

          <section className="mt-7" aria-label={t("portal.edu.whatItMeans")}>
            <h2 className="text-lg font-bold text-foreground">{t("portal.edu.whatItMeans")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{guide.whatItMeans}</p>
          </section>

          <EduList title={t("portal.edu.commonCauses")} items={guide.commonCauses} />
          <EduList title={t("portal.edu.whenToSeek")} items={guide.whenToSeekAssessment} tinted />

          {/* Red flags */}
          {guide.redFlags.length > 0 && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5"
            >
              <h2 className="flex items-center gap-2 text-base font-bold text-red-900">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                {t("portal.edu.redFlags")}
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-red-900">
                {guide.redFlags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-900">
                Emergency in Bangladesh: call 999 — free, 24/7.
              </p>
            </div>
          )}

          {/* Relevant specialties */}
          {guide.relevantSpecialties.length > 0 && (
            <section className="mt-7" aria-label={t("portal.edu.relevantSpecialties")}>
              <h2 className="text-lg font-bold text-foreground">
                {t("portal.edu.relevantSpecialties")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {guide.relevantSpecialties.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      track("doctor_search");
                      setPortalView({ name: "doctors", q: s }, { push: true });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t("portal.edu.findSpecialist", { specialty: s })}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-8">
            <MedicalDisclaimerBox text={data.disclaimer} />
          </div>

          <SourcesAndReview sources={guide.sources} reviewedAt={guide.reviewedAt} />
        </article>
      )}
    </main>
  );
}

/** Shared list block for education pages. */
export function EduList({
  title,
  items,
  tinted,
}: {
  title: string;
  items: string[];
  tinted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <Card
        className={
          tinted ? "mt-3 border-primary/25 bg-primary-soft/40 shadow-none" : "mt-3 shadow-none"
        }
      >
        <CardContent className="p-5">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

export function SourcesAndReview({
  sources,
  reviewedAt,
}: {
  sources: { title: string; publisher: string; url: string }[];
  reviewedAt: string | null;
}) {
  const { t } = useT();
  return (
    <section aria-label={t("portal.library.sources")} className="mt-6">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <ShieldCheck className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
        {t("portal.library.sources")}
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {sources.map((s, i) => (
          <li key={i}>
            {s.publisher}:{" "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        {t("portal.edu.reviewedAt")}: {reviewedAt ?? "— (medical review pending)"}
      </p>
    </section>
  );
}
