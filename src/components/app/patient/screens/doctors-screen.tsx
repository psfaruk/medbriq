"use client";

/**
 * DoctorsScreen — sticky search + filters + paginated doctor results.
 * Consumes the module-level searchPreset (set by Home / Specialties) on
 * mount and clears it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api-client";
import type { DoctorCard, SpecialtyInfo } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  useT,
} from "@/components/app/shared/ui-kit";
import { DoctorCardRow } from "../parts";
import { searchPreset } from "../index";

const PAGE_SIZE = 12;
const FEE_STEPS = ["300", "500", "800", "1000", "1500", "2000"];
const SORTS = [
  { value: "relevance", label: "Recommended" },
  { value: "rating", label: "Highest rated" },
  { value: "experience", label: "Most experienced" },
];

export default function DoctorsScreen() {
  const { t } = useT();

  // consume the preset exactly once on mount (read in initializers, clear in
  // an effect so nothing mutates module state during render)
  const [q, setQ] = useState(() => searchPreset.q ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [specialty, setSpecialty] = useState(() => searchPreset.specialty ?? "");
  const [city, setCity] = useState("ALL");
  const [availableToday, setAvailableToday] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [maxFee, setMaxFee] = useState("0");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);

  const [specialties, setSpecialties] = useState<SpecialtyInfo[] | null>(null);
  const [cities, setCities] = useState<string[] | null>(null);
  const [items, setItems] = useState<DoctorCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const runRef = useRef(0);

  // debounce the free-text query; a change always restarts from page 1
  useEffect(() => {
    delete searchPreset.q;
    delete searchPreset.specialty;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
      setLoading(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  // filter reference data
  useEffect(() => {
    let active = true;
    apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
      .then((d) => {
        if (active) setSpecialties(d.items);
      })
      .catch(() => {
        if (active) setSpecialties([]);
      });
    apiGet<{ cities: string[] }>("/api/v1/meta")
      .then((d) => {
        if (active) setCities(d.cities);
      })
      .catch(() => {
        if (active) setCities([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // results fetch (guarded against out-of-order responses)
  useEffect(() => {
    const myRun = ++runRef.current;
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (specialty) params.set("specialty", specialty);
    if (city !== "ALL") params.set("city", city);
    if (availableToday) params.set("availableToday", "true");
    if (verifiedOnly) params.set("verified", "true");
    if (maxFee !== "0") params.set("maxFee", maxFee);
    if (sort === "rating") params.set("sort", "rating");
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    apiGet<{ items: DoctorCard[]; total: number }>(
      `/api/v1/doctors?${params.toString()}`
    )
      .then((d) => {
        if (runRef.current !== myRun) return;
        setItems((prev) =>
          page === 1 ? d.items : [...(prev ?? []), ...d.items]
        );
        setTotal(d.total);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (runRef.current !== myRun) return;
        setError(err instanceof Error ? err.message : "Failed to load doctors");
        setLoading(false);
      });
  }, [debouncedQ, specialty, city, availableToday, verifiedOnly, maxFee, sort, page, reloadKey]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const changeFilter = (fn: () => void) => {
    fn();
    setPage(1);
    setLoading(true);
  };

  const clearFilters = () => {
    setQ("");
    setSpecialty("");
    setCity("ALL");
    setAvailableToday(false);
    setVerifiedOnly(false);
    setMaxFee("0");
    setSort("relevance");
    setPage(1);
    setLoading(true);
  };

  const hasActiveFilters =
    debouncedQ !== "" ||
    specialty !== "" ||
    city !== "ALL" ||
    availableToday ||
    verifiedOnly ||
    maxFee !== "0";

  const specialtyName = useMemo(
    () => specialties?.find((s) => s.slug === specialty)?.name ?? null,
    [specialties, specialty]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={specialtyName ? specialtyName : t("search.title")}
        subtitle={
          items !== null && !loading && !error
            ? t("search.results", { count: total })
            : undefined
        }
      />

      {/* ── sticky search + filters ─────────────────────────────── */}
      <div className="sticky top-14 md:top-16 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-11 rounded-2xl border-border bg-card pl-9 shadow-soft"
            aria-label={t("search.placeholder")}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            value={specialty || "ALL"}
            onValueChange={(v) => changeFilter(() => setSpecialty(v === "ALL" ? "" : v))}
          >
            <SelectTrigger className="h-10 rounded-xl bg-card text-xs" aria-label={t("search.specialty")}>
              <SelectValue placeholder={t("search.specialty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("search.anySpecialty")}</SelectItem>
              {(specialties ?? []).map((s) => (
                <SelectItem key={s.id} value={s.slug}>
                  {s.name} ({s.doctorCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={city} onValueChange={(v) => changeFilter(() => setCity(v))}>
            <SelectTrigger className="h-10 rounded-xl bg-card text-xs" aria-label={t("search.city")}>
              <SelectValue placeholder={t("search.city")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("search.anyCity")}</SelectItem>
              {(cities ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={maxFee} onValueChange={(v) => changeFilter(() => setMaxFee(v))}>
            <SelectTrigger className="h-10 rounded-xl bg-card text-xs" aria-label={t("search.maxFee")}>
              <SelectValue placeholder={t("search.maxFee")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("search.maxFee")}: any</SelectItem>
              {FEE_STEPS.map((fee) => (
                <SelectItem key={fee} value={fee}>
                  ৳ {Number(fee).toLocaleString("en-US")} or less
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => changeFilter(() => setSort(v))}>
            <SelectTrigger className="h-10 rounded-xl bg-card text-xs" aria-label={t("search.sortBy")}>
              <SelectValue placeholder={t("search.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.value === "relevance"
                    ? t("search.sortBy") + ": " + s.label
                    : s.value === "rating"
                      ? t("search.sortRating")
                      : t("search.sortExperience")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <FilterChip
            active={availableToday}
            onClick={() => changeFilter(() => setAvailableToday(!availableToday))}
          >
            {t("search.availableToday")}
          </FilterChip>
          <FilterChip
            active={verifiedOnly}
            onClick={() => changeFilter(() => setVerifiedOnly(!verifiedOnly))}
          >
            {t("search.verifiedOnly")}
          </FilterChip>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {/* ── results ─────────────────────────────────────────────── */}
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : items === null && loading ? (
        <div className="space-y-3">
          <LoadingCard rows={4} />
          <LoadingCard rows={4} />
        </div>
      ) : items === null ? null : items.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t("search.noResults")}
          hint={t("search.noResultsHint")}
          action={
            hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((doc) => (
              <DoctorCardRow key={doc.id} doctor={doc} />
            ))}
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : items.length < total ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p + 1);
                }}
              >
                Load more ({items.length} / {total})
              </Button>
            </div>
          ) : (
            <p className="pb-2 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              End of results
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
      {children}
    </button>
  );
}
