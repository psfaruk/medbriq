"use client";

/**
 * Public hospital directory (spec §5). No login required; verification
 * status is displayed honestly.
 */

import { useState } from "react";
import { Building2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HospitalInfo } from "@/lib/types";
import { useT, EmptyState, ErrorState } from "@/components/app/shared/ui-kit";
import { Breadcrumbs, PortalLink, usePortalData, useTrackPageView } from "../shared";

export default function HospitalDirectoryView({
  initial,
}: {
  initial?: { city?: string };
}) {
  const { t } = useT();
  useTrackPageView("hospitals");
  const [q, setQ] = useState("");
  const [city, setCity] = useState(initial?.city ?? "all");

  const { data, loading, error, reload } = usePortalData<{ items: HospitalInfo[] }>(
    "/api/v1/hospitals"
  );

  const cities = Array.from(new Set((data?.items ?? []).map((h) => h.city))).sort();
  const filtered = (data?.items ?? []).filter((h) => {
    if (city !== "all" && h.city !== city) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      return (
        h.name.toLowerCase().includes(needle) ||
        h.city.toLowerCase().includes(needle) ||
        (h.address ?? "").toLowerCase().includes(needle)
      );
    }
    return true;
  });

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.nav.hospitals"), view: { name: "hospitals" } }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.section.hospitals")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("portal.section.hospitalsSub")}
        </p>
      </header>

      <form
        role="search"
        aria-label="Hospital search"
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex-1">
          <Label htmlFor="hospital-q" className="sr-only">
            {t("common.search")}
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="hospital-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Hospital or clinic name, area…"
              className="h-11 pl-9"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <Label htmlFor="hospital-city" className="sr-only">
            {t("portal.doctor.city")}
          </Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger id="hospital-city" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("portal.hero.allCities")}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>

      <p className="mb-4 text-sm font-semibold text-foreground" aria-live="polite">
        {data ? t("portal.hospital.results", { count: filtered.length }) : ""}
      </p>

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
          icon={<Building2 className="h-6 w-6" />}
          title="No hospitals match your search"
          hint="Try a different name or city."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQ("");
                setCity("all");
              }}
            >
              {t("portal.doctor.clear")}
            </Button>
          }
        />
      )}
      {data && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <PortalLink
              key={h.slug}
              view={{ name: "hospital", slug: h.slug }}
              ctaLabel="hospital-card"
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#13A89E]/10 text-[#0f8f87]">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-bold text-foreground group-hover:text-primary">
                {h.name}
              </h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {[h.address, h.city].filter(Boolean).join(", ")}
              </p>
              {h.about && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {h.about}
                </p>
              )}
              <p className="mt-auto pt-3 text-sm font-semibold text-[#0f8f87]">
                {h.doctorCount} {h.doctorCount === 1 ? "doctor" : "doctors"} practising →
              </p>
            </PortalLink>
          ))}
        </div>
      )}
    </main>
  );
}
