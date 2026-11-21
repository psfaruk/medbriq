"use client";

/**
 * Public hospital directory (spec §5). No login required; verification
 * status is displayed honestly.
 */

import { useMemo, useState } from "react";
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
import type { GeoDivision } from "@/lib/geo";
import { districtToDivision } from "@/lib/geo";
import { useT, EmptyState, ErrorState } from "@/components/app/shared/ui-kit";
import { Breadcrumbs, PortalLink, usePortalData, useTrackPageView } from "../shared";

const FACILITY_TYPES: { value: string; label: string }[] = [
  { value: "all", label: "All facilities" },
  { value: "HOSPITAL", label: "Hospitals" },
  { value: "CLINIC", label: "Clinics" },
  { value: "DIAGNOSTIC", label: "Diagnostic Centers" },
];

function facilityLabel(type: string): string {
  return type === "DIAGNOSTIC"
    ? "Diagnostic Center"
    : type === "CLINIC"
      ? "Clinic"
      : "Hospital";
}

export default function HospitalDirectoryView({
  initial,
}: {
  initial?: { city?: string };
}) {
  const { t } = useT();
  useTrackPageView("hospitals");
  const [q, setQ] = useState("");
  const [city, setCity] = useState(initial?.city ?? "all");
  const [division, setDivision] = useState("all");
  const [facilityType, setFacilityType] = useState("all");

  const { data, loading, error, reload } = usePortalData<{ items: HospitalInfo[] }>(
    "/api/v1/hospitals"
  );
  const geo = usePortalData<{ divisions: GeoDivision[] }>("/api/v1/geo");
  const divisions = geo.data?.divisions ?? [];

  // A hospital's city string is its district. Division filtering maps the
  // district to its division via the reference geo data.
  const filtered = useMemo(() => {
    return (data?.items ?? []).filter((h) => {
      if (facilityType !== "all" && h.type !== facilityType) return false;
      if (city !== "all" && h.city !== city) return false;
      if (division !== "all" && districtToDivision(h.city) !== division) return false;
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
  }, [data, city, division, facilityType, q]);

  // City list respects the selected division (districts of that division).
  const cityOptions = useMemo(() => {
    const items = data?.items ?? [];
    const cities = Array.from(new Set(items.map((h) => h.city))).sort();
    if (division === "all") return cities;
    return cities.filter((c) => districtToDivision(c) === division);
  }, [data, division]);

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
        <div className="sm:w-40">
          <Label htmlFor="hospital-type" className="sr-only">
            Facility type
          </Label>
          <Select value={facilityType} onValueChange={setFacilityType}>
            <SelectTrigger id="hospital-type" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_TYPES.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-44">
          <Label htmlFor="hospital-division" className="sr-only">
            Division
          </Label>
          <Select
            value={division}
            onValueChange={(v) => {
              setDivision(v);
              setCity("all");
            }}
          >
            <SelectTrigger id="hospital-division" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.name} value={d.name}>
                  {d.name} Division
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-44">
          <Label htmlFor="hospital-city" className="sr-only">
            {t("portal.doctor.city")}
          </Label>
          <Select value={city} onValueChange={setCity} disabled={division === "all"}>
            <SelectTrigger id="hospital-city" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("portal.hero.allCities")}</SelectItem>
              {cityOptions.map((c) => (
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
          title="No facilities match this search yet"
          hint="We only list real registered facilities — there are currently none matching your filters. Try a broader location or a different facility type."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQ("");
                setCity("all");
                setDivision("all");
                setFacilityType("all");
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
              <span className="mt-3 flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground group-hover:text-primary">
                  {h.name}
                </h2>
              </span>
              <span className="mt-1.5 w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                {facilityLabel(h.type)}
              </span>
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
