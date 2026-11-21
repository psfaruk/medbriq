"use client";

/**
 * Medical equipment education (spec §8): what devices are, what they
 * measure, safe use, limitations, and when professional help is needed.
 * Icon-led (no product photos) — never an unverified marketplace.
 */

import { Thermometer, FileQuestion } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { EquipmentGuide } from "@/content";
import { useT, EmptyState, ErrorState, DemoNotice } from "@/components/app/shared/ui-kit";
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
  items: { slug: string; name: string; nameBn: string | null; summary: string; icon: string }[];
  disclaimer: string;
};
type DetailResponse = { guide: EquipmentGuide; disclaimer: string };

export function EquipmentHomeView() {
  const { t, lang } = useT();
  useTrackPageView("equipment");
  const { data, loading, error, reload } = usePortalData<ListResponse>(
    "/api/v1/content/equipment"
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((e) => (
            <PortalLink
              key={e.slug}
              view={{ name: "equipment-item", slug: e.slug }}
              ctaLabel="equipment-card"
              className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ContentIcon name={e.icon} className="h-7 w-7" />
              </span>
              <span>
                <span className="block text-sm font-bold leading-snug text-foreground group-hover:text-primary">
                  {lang === "bn" && e.nameBn ? e.nameBn : e.name}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                  {e.summary}
                </span>
              </span>
            </PortalLink>
          ))}
        </div>
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
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ContentIcon name={guide.icon} className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                {lang === "bn" && guide.nameBn ? guide.nameBn : guide.name}
              </h1>
              <p className="mt-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                {t("portal.library.reviewStatus")}
              </p>
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

          <EduList title={t("portal.edu.commonUses")} items={guide.commonUses} />
          <EduList title={t("portal.edu.safeUse")} items={guide.safeUse} tinted />
          <EduList title={t("portal.edu.limitations")} items={guide.limitations} />
          <EduList
            title={t("portal.edu.whenProfessionalHelp")}
            items={guide.whenProfessionalHelp}
            tinted
          />

          <div className="mt-8">
            <MedicalDisclaimerBox text={data.disclaimer} />
          </div>

          <SourcesAndReview sources={guide.sources} reviewedAt={guide.reviewedAt} />
        </article>
      )}
    </main>
  );
}
