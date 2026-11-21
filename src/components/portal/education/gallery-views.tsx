"use client";

/**
 * Children's health & family/community healthcare galleries (spec §5-6).
 * Every visual is an AI-generated illustrative scene — the view states this
 * prominently so images are never mistaken for photographs of real patients,
 * families or hospitals. Dignified, respectful portrayal is the rule.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { Baby, Users, ArrowRight, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GalleryItem } from "@/content";
import { useT, EmptyState, ErrorState } from "@/components/app/shared/ui-kit";
import { cn } from "@/lib/utils";
import {
  Breadcrumbs,
  EducationNotice,
  MedicalDisclaimerBox,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";

type GalleriesResponse = {
  children: GalleryItem[];
  family: GalleryItem[];
  aiIllustrationNotice: string;
};

function AiNotice({ text }: { text: string }) {
  return (
    <aside
      role="note"
      className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground"
    >
      <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[#13A89E]" aria-hidden="true" />
      {text} They are respectful, dignified illustrations created for health
      education — not images of real people, and never evidence of a real
      facility or outcome.
    </aside>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  return (
    <figure className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative block aspect-[4/3] w-full overflow-hidden bg-accent">
        <Image
          src={item.image}
          alt={item.alt}
          fill
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.ageGroup && (
          <span className="absolute left-2 top-2 rounded-full bg-[#172B4D]/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {item.ageGroup}
          </span>
        )}
      </div>
      <figcaption className="flex flex-1 flex-col p-4">
        <span className="text-sm font-bold text-foreground">{item.caption}</span>
        {item.captionBn && (
          <span className="mt-0.5 text-xs font-medium text-[#0f8f87]">{item.captionBn}</span>
        )}
        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
        {item.related && (
          <PortalLink
            view={{ name: item.related.view, slug: item.related.slug } as never}
            ctaLabel="gallery-related-guide"
            className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Read the related guide
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </PortalLink>
        )}
      </figcaption>
    </figure>
  );
}

function CategoryChips({
  categories,
  active,
  onChange,
  counts,
}: {
  categories: string[];
  active: string | null;
  onChange: (c: string | null) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter gallery">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          active === null
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:bg-muted"
        )}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(active === c ? null : c)}
          aria-pressed={active === c}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            active === c
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          {c} ({counts[c] ?? 0})
        </button>
      ))}
    </div>
  );
}

// ── Children's health gallery ─────────────────────────────────────────

export function ChildrensHealthView() {
  const { t } = useT();
  useTrackPageView("childrens-health");
  const [category, setCategory] = useState<string | null>(null);
  const { data, loading, error, reload } = usePortalData<GalleriesResponse>(
    "/api/v1/content/galleries?kind=children"
  );

  const items = useMemo(
    () =>
      data
        ? data.children.filter((g) => !category || g.category === category)
        : [],
    [data, category]
  );

  const categories = useMemo(
    () => (data ? Array.from(new Set(data.children.map((g) => g.category))) : []),
    [data]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    data?.children.forEach((g) => {
      c[g.category] = (c[g.category] ?? 0) + 1;
    });
    return c;
  }, [data]);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          { label: "Children's Health" },
        ]}
      />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Children&apos;s Health <span className="text-[#0f8f87]">শিশুদের স্বাস্থ্য</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Age-by-age visuals and care moments — from newborn (0–28 days) to
          adolescence (13–17 years) — with honest, plain-language context for
          parents and families.
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <EducationNotice>
          These images and captions are general health education. They never
          replace assessment of a real child by a qualified doctor. Any baby
          under 3 months with fever needs hospital care immediately.
        </EducationNotice>
        {data && <AiNotice text={data.aiIllustrationNotice} />}
      </div>

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data && data.children.length === 0 && (
        <EmptyState icon={<Baby className="h-6 w-6" />} title="No gallery items published yet." />
      )}
      {data && data.children.length > 0 && (
        <>
          <CategoryChips
            categories={categories}
            active={category}
            onChange={setCategory}
            counts={counts}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((g) => (
              <GalleryCard key={g.slug} item={g} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8">
        <MedicalDisclaimerBox />
      </div>
    </main>
  );
}

// ── Family & community healthcare gallery ─────────────────────────────

export function FamilyHealthView({ community }: { community?: boolean }) {
  const { t } = useT();
  useTrackPageView(community ? "community-health" : "family-health");
  const [category, setCategory] = useState<string | null>(community ? "Community health" : null);
  const { data, loading, error, reload } = usePortalData<GalleriesResponse>(
    "/api/v1/content/galleries?kind=family"
  );

  const items = useMemo(
    () => (data ? data.family.filter((g) => !category || g.category === category) : []),
    [data, category]
  );

  const categories = useMemo(
    () => (data ? Array.from(new Set(data.family.map((g) => g.category))) : []),
    [data]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    data?.family.forEach((g) => {
      c[g.category] = (c[g.category] ?? 0) + 1;
    });
    return c;
  }, [data]);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          { label: community ? "Community Health" : "Family Healthcare" },
        ]}
      />
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {community ? (
            <>
              Community Health <span className="text-[#0f8f87]">কমিউনিটি স্বাস্থ্যসেবা</span>
            </>
          ) : (
            <>
              Family Healthcare <span className="text-[#0f8f87]">পরিবারের স্বাস্থ্যশিক্ষা</span>
            </>
          )}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {community
            ? "Rural clinics, outreach visits, health camps and mobile services — how care reaches communities across Bangladesh."
            : "Family, community and accessible-care education: respectful visuals with honest captions — because good care is everyone's right, regardless of income."}
        </p>
      </header>

      <div className="mb-6 space-y-3">
        <EducationNotice>
          These visuals support general health education. They show respectful,
          dignified care — never pity, and never real patients.
        </EducationNotice>
        {data && <AiNotice text={data.aiIllustrationNotice} />}
      </div>

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data && data.family.length === 0 && (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No gallery items published yet." />
      )}
      {data && data.family.length > 0 && (
        <>
          <CategoryChips
            categories={categories}
            active={category}
            onChange={setCategory}
            counts={counts}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((g) => (
              <GalleryCard key={g.slug} item={g} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8">
        <MedicalDisclaimerBox />
      </div>
    </main>
  );
}
