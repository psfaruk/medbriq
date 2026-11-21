"use client";

/**
 * Health Library home (spec §6): category grid, searchable article list,
 * symptom + equipment hubs. Public — no account required.
 */

import { useMemo, useState } from "react";
import { Search, BookOpen, Activity, Thermometer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useT, EmptyState, ErrorState, DemoNotice } from "@/components/app/shared/ui-kit";
import type { ArticleCategory } from "@/content";
import {
  Breadcrumbs,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";
import { ArticleCard, categoryLabel, type ArticleSummary } from "../home/sections";

type LibraryResponse = {
  items: ArticleSummary[];
  categories: ArticleCategory[];
  disclaimer: string;
};

export default function LibraryView({
  initial,
}: {
  initial?: { category?: string };
}) {
  const { t, lang } = useT();
  useTrackPageView("library");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>(initial?.category ?? "all");

  const { data, loading, error, reload } = usePortalData<LibraryResponse>(
    "/api/v1/content/articles"
  );

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const needle = q.trim().toLowerCase();
    return items.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!needle) return true;
      return (
        a.title.toLowerCase().includes(needle) ||
        (a.titleBn ?? "").includes(needle) ||
        a.summary.toLowerCase().includes(needle)
      );
    });
  }, [data, q, category, lang]);

  const categories = data?.categories ?? [];

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.library.title") }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.library.title")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("portal.library.sub")}
        </p>
      </header>

      <div className="mb-6">
        <DemoNotice>
          Demo content — written for illustration. Every guide requires
          qualified medical review before any real public launch; each article
          shows its honest review status.
        </DemoNotice>
      </div>

      {/* Hubs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <PortalLink
          view={{ name: "symptoms" }}
          ctaLabel="library-symptoms-hub"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#13A89E]/10 text-[#0f8f87]">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-foreground group-hover:text-primary sm:text-base">
              {t("portal.library.symptomsHub")}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {t("portal.library.symptomsHubDesc")}
            </span>
          </span>
        </PortalLink>
        <PortalLink
          view={{ name: "equipment" }}
          ctaLabel="library-equipment-hub"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Thermometer className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-foreground group-hover:text-primary sm:text-base">
              {t("portal.library.equipmentHub")}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {t("portal.library.equipmentHubDesc")}
            </span>
          </span>
        </PortalLink>
      </div>

      {/* Category chips */}
      <nav aria-label={t("portal.library.categories")} className="mb-5 flex flex-wrap gap-2">
        <CategoryChip
          label={t("portal.library.allCategories")}
          active={category === "all"}
          onClick={() => setCategory("all")}
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.slug}
            label={lang === "bn" ? c.nameBn : c.name}
            active={category === c.slug}
            onClick={() => setCategory(c.slug)}
          />
        ))}
      </nav>

      {/* Search */}
      <form
        role="search"
        aria-label="Search the health library"
        className="mb-6 flex gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("portal.library.searchPlaceholder")}
            aria-label={t("portal.library.searchPlaceholder")}
            className="h-11 pl-9"
          />
        </div>
        {q && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("portal.doctor.clear")}
            onClick={() => setQ("")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </form>

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data && filtered.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t("portal.library.noResults")}
          hint="Try another keyword or category."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQ("");
                setCategory("all");
              }}
            >
              {t("portal.doctor.clear")}
            </Button>
          }
        />
      )}
      {data && filtered.length > 0 && (
        <>
          <p className="mb-4 text-sm font-semibold text-muted-foreground" aria-live="polite">
            {category === "all"
              ? `${filtered.length} ${t("portal.library.latest").toLowerCase()}`
              : `${filtered.length} in ${categoryLabel(category)}`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
