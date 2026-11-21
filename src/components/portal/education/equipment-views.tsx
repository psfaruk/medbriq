"use client";

/**
 * Medical equipment education (spec §8): what devices are, what they
 * measure, safe use, limitations, and when professional help is needed.
 * Illustration-led 3D renders + icons — never an unverified marketplace.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { Thermometer, FileQuestion, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { EquipmentGuide } from "@/content";
import { useT, EmptyState, ErrorState, DemoNotice } from "@/components/app/shared/ui-kit";
import { cn } from "@/lib/utils";
import {
  Breadcrumbs,
  ContentIcon,
  EducationNotice,
  MedicalDisclaimerBox,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";
import { EduList, SourcesAndReview } from "./symptom-views";

type ListResponse = {
  items: {
    slug: string;
    name: string;
    nameBn: string | null;
    summary: string;
    icon: string;
    category: string | null;
    image: string | null;
  }[];
  disclaimer: string;
};
type DetailResponse = { guide: EquipmentGuide; disclaimer: string };

const EQUIPMENT_CATEGORIES = [
  "Monitoring and Basic Equipment",
  "Diagnostic and Imaging Equipment",
  "Treatment and Life-Support Equipment",
] as const;

function categoryShort(name: string): string {
  return name
    .replace("Monitoring and Basic Equipment", "Monitoring & Basic")
    .replace("Diagnostic and Imaging Equipment", "Diagnostic & Imaging")
    .replace("Treatment and Life-Support Equipment", "Treatment & Life-Support");
}

export function EquipmentHomeView() {
  const { t, lang } = useT();
  useTrackPageView("equipment");
  const [category, setCategory] = useState<string | null>(null);
  const { data, loading, error, reload } = usePortalData<ListResponse>(
    "/api/v1/content/equipment"
  );

  const items = useMemo(
    () => (data ? data.items.filter((e) => !category || e.category === category) : []),
    [data, category]
  );

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          { label: t("portal.library.equipmentHub") },
        ]}
      />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.library.equipmentHub")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("portal.library.equipmentHubDesc")}
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <EducationNotice>
          These guides explain common home medical devices in general terms.
          They are not product reviews or endorsements, and home readings never
          replace professional assessment.
        </EducationNotice>
        <DemoNotice>
          Demo content — requires qualified medical review before real public
          launch. Review status is shown per guide.
        </DemoNotice>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState icon={<Thermometer className="h-6 w-6" />} title="No equipment guides published yet." />
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
            {EQUIPMENT_CATEGORIES.map((c) => {
              const count = data.items.filter((e) => e.category === c).length;
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((e) => (
              <PortalLink
                key={e.slug}
                view={{ name: "equipment-item", slug: e.slug }}
                ctaLabel="equipment-card"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-primary-soft">
                  {e.image ? (
                    <Image
                      src={e.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 15rem, (min-width: 640px) 28vw, 45vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-primary">
                      <ContentIcon name={e.icon} className="h-10 w-10" />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-1 p-4">
                  <span className="block text-sm font-bold leading-snug text-foreground group-hover:text-primary">
                    {lang === "bn" && e.nameBn ? e.nameBn : e.name}
                  </span>
                  <span className="line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                    {e.summary}
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

export function EquipmentDetailView({ slug }: { slug: string }) {
  const { t, lang } = useT();
  useTrackPageView("equipment-item");
  const { data, loading, error, reload } = usePortalData<DetailResponse>(
    `/api/v1/content/equipment?slug=${encodeURIComponent(slug)}`
  );

  const guide = data?.guide ?? null;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          { label: t("portal.library.equipmentHub"), view: { name: "equipment" } },
          { label: guide?.name ?? "…" },
        ]}
      />

      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2 rounded-lg" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && !data && (
        <EmptyState
          icon={<FileQuestion className="h-6 w-6" />}
          title="Equipment guide not found"
          action={
            <PortalLink view={{ name: "equipment" }}>
              <Button size="sm" variant="outline">
                {t("portal.cta.viewAllEquipment")}
              </Button>
            </PortalLink>
          }
        />
      )}

      {guide && data && (
        <article>
          {/* Hero illustration + title */}
          {guide.image && (
            <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-primary-soft shadow-soft">
              <Image
                src={guide.image}
                alt=""
                fill
                sizes="(min-width: 768px) 48rem, 100vw"
                className="object-cover"
                priority={false}
              />
              <span
                className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur"
              >
                AI-generated illustration — not a product photograph
              </span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ContentIcon name={guide.icon} className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                {lang === "bn" && guide.nameBn ? guide.nameBn : guide.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {guide.category && (
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {categoryShort(guide.category)}
                  </span>
                )}
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  {t("portal.library.reviewStatus")}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{guide.summary}</p>

          <div className="mt-5">
            <EducationNotice />
          </div>

          <section className="mt-7" aria-label={t("portal.edu.whatItIs")}>
            <h2 className="text-lg font-bold text-foreground">{t("portal.edu.whatItIs")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{guide.whatItIs}</p>
          </section>

          <section className="mt-6" aria-label={t("portal.edu.whatItMeasures")}>
            <h2 className="text-lg font-bold text-foreground">
              {t("portal.edu.whatItMeasures")}
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{guide.whatItMeasures}</p>
          </section>

          {guide.howItWorks && (
            <section className="mt-6" aria-label="How it works">
              <h2 className="text-lg font-bold text-foreground">How it works</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{guide.howItWorks}</p>
            </section>
          )}

          <EduList title={t("portal.edu.commonUses")} items={guide.commonUses} />

          {guide.whoOperates && (
            <section className="mt-6" aria-label="Who operates it">
              <h2 className="text-lg font-bold text-foreground">Who operates it</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{guide.whoOperates}</p>
            </section>
          )}

          <EduList title={t("portal.edu.safeUse")} items={guide.safeUse} tinted />
          <EduList title={t("portal.edu.limitations")} items={guide.limitations} />

          {guide.maintenance && (
            <section className="mt-6" aria-label="Maintenance">
              <h2 className="text-lg font-bold text-foreground">Maintenance &amp; servicing</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{guide.maintenance}</p>
            </section>
          )}

          <EduList
            title={t("portal.edu.whenProfessionalHelp")}
            items={guide.whenProfessionalHelp}
            tinted
          />

          {guide.relatedSpecialties && guide.relatedSpecialties.length > 0 && (
            <section className="mt-6" aria-label="Related specialties">
              <h2 className="text-lg font-bold text-foreground">Related specialties</h2>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">
                Find doctors in the specialties that commonly use this equipment:
              </p>
              <div className="flex flex-wrap gap-2">
                {guide.relatedSpecialties.map((s) => (
                  <PortalLink
                    key={s}
                    view={{ name: "doctors", q: s }}
                    ctaLabel="equipment-related-specialty"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {s}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </PortalLink>
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
