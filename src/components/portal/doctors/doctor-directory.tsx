"use client";

/**
 * Public doctor directory (spec §4): search, filters (specialty, city,
 * verified, max fee, available today), paginated grid. No login required.
 */

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DoctorCard, SpecialtyInfo } from "@/lib/types";
import { getPreloadedBoot } from "@/lib/boot-data";
import { useAppStore, type PortalView } from "@/lib/app-state";
import { track } from "@/lib/analytics";
import { useT, EmptyState, ErrorState } from "@/components/app/shared/ui-kit";
import { Breadcrumbs, usePortalData, useTrackPageView } from "../shared";
import { DoctorCard as DoctorCardComponent } from "./doctor-card";

type DoctorsPage = {
  items: DoctorCard[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 12;
const FEE_STEPS = ["300", "500", "800", "1000", "1500", "2000"];

export default function DoctorDirectoryView({
  initial,
}: {
  initial?: Extract<PortalView, { name: "doctors" }>;
}) {
  const { t } = useT();
  useTrackPageView("doctors");
  const setPortalView = useAppStore((s) => s.setPortalView);
  const preloaded = getPreloadedBoot();

  // Filters initialize directly from the deep-link props (the portal shell
  // remounts this view with a key when the URL params change, so no sync
  // effect is needed — e.g. clicking a specialty chip while already here).
  const [q, setQ] = useState(initial?.q ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "all");
  const [city, setCity] = useState(initial?.city ?? "all");
  const [maxFee, setMaxFee] = useState("any");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [availableToday, setAvailableToday] = useState(false);
  const [page, setPage] = useState(1);

  // Filters initialize directly from the deep-link props. The portal shell
  // remounts this view with a key when URL params change (e.g. clicking a
  // specialty chip while already on this view), so no sync effect is needed.

  const specialties: SpecialtyInfo[] = preloaded?.specialties ?? [];

  const query = useMemo(() => {
    const p = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (q.trim()) p.set("q", q.trim());
    if (specialty !== "all") p.set("specialty", specialty);
    if (city !== "all") p.set("city", city);
    if (verifiedOnly) p.set("verified", "true");
    if (availableToday) p.set("availableToday", "true");
    if (maxFee !== "any") p.set("maxFee", maxFee);
    return p.toString();
  }, [q, specialty, city, verifiedOnly, availableToday, maxFee, page]);

  const { data, loading, error, reload } = usePortalData<DoctorsPage>(
    `/api/v1/doctors?${query}`
  );

  // Track a search event whenever filters change (not the query text itself).
  useEffect(() => {
    if (data) track("doctor_search", { resultCount: data.total });
     
  }, [query]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function resetFilters() {
    setQ("");
    setSpecialty("all");
    setCity("all");
    setMaxFee("any");
    setAvailableToday(false);
    setVerifiedOnly(true);
    setPage(1);
  }

  const hasActiveFilters =
    q.trim() !== "" ||
    specialty !== "all" ||
    city !== "all" ||
    maxFee !== "any" ||
    availableToday ||
    !verifiedOnly;

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[{ label: t("portal.nav.findDoctors"), view: { name: "doctors" } }]}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.nav.findDoctors")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("portal.cat.doctorsDesc")}
        </p>
      </header>

      {/* Search + filters */}
      <form
        role="search"
        aria-label="Doctor search filters"
        className="rounded-2xl border border-border bg-card p-4 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="doctor-q" className="sr-only">
              {t("common.search")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="doctor-q"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={t("portal.hero.searchPlaceholder")}
                className="h-11 pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="doctor-specialty" className="sr-only">
              {t("portal.doctor.specialty")}
            </Label>
            <Select
              value={specialty}
              onValueChange={(v) => {
                setSpecialty(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="doctor-specialty" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("portal.doctor.allSpecialties")}</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name} ({s.doctorCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doctor-city" className="sr-only">
              {t("portal.doctor.city")}
            </Label>
            <Select
              value={city}
              onValueChange={(v) => {
                setCity(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="doctor-city" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("portal.hero.allCities")}</SelectItem>
                {["Dhaka", "Chattogram"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="verified-only"
              checked={verifiedOnly}
              onCheckedChange={(v) => {
                setVerifiedOnly(v);
                setPage(1);
              }}
            />
            <Label htmlFor="verified-only" className="cursor-pointer text-sm font-medium">
              {t("portal.doctor.verifiedOnly")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="available-today"
              checked={availableToday}
              onCheckedChange={(v) => {
                setAvailableToday(v);
                setPage(1);
              }}
            />
            <Label htmlFor="available-today" className="cursor-pointer text-sm font-medium">
              {t("portal.doctor.availableToday")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="max-fee" className="text-sm font-medium">
              {t("portal.doctor.maxFee")}:
            </Label>
            <Select
              value={maxFee}
              onValueChange={(v) => {
                setMaxFee(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="max-fee" size="sm" className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("portal.doctor.anyFee")}</SelectItem>
                {FEE_STEPS.map((f) => (
                  <SelectItem key={f} value={f}>
                    ৳ {f}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="ml-auto gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t("portal.doctor.clear")}
            </Button>
          )}
        </div>
      </form>

      {/* Results */}
      <p className="mb-4 mt-6 flex items-center gap-2 text-sm font-semibold text-foreground" aria-live="polite">
        <SlidersHorizontal className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
        {loading && !data
          ? t("common.loading")
          : data
            ? t("portal.doctor.results", { count: data.total })
            : ""}
      </p>

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No doctors match your filters"
          hint="Try clearing the filters or searching a different name, specialty or city."
          action={
            <Button size="sm" variant="outline" onClick={resetFilters}>
              {t("portal.doctor.clear")}
            </Button>
          }
        />
      )}
      {data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((doctor) => (
              <DoctorCardComponent key={doctor.slug} doctor={doctor} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Doctor directory pages"
              className="mt-8 flex items-center justify-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setPortalView({ name: "doctors" });
                }}
              >
                {t("portal.doctor.prev")}
              </Button>
              <span className="px-2 text-sm font-semibold text-muted-foreground" aria-live="polite">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("portal.doctor.next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
