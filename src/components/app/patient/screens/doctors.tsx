"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import { searchPreset, clearSearchPreset } from "../preset";
import type { DoctorCard, SpecialtyInfo } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  Stars,
  UserAvatar,
  VerificationBadge,
  useT,
} from "@/components/app/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, CalendarCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type CityOption = { name: string };

/** Doctor search + advanced filters + results (master prompt §3.10-12). */
export default function DoctorsScreen() {
  const { t } = useT();
  const { pushPatient } = useAppStore();

  const [query, setQuery] = useState(() => searchPreset.q ?? "");
  const [specialty, setSpecialty] = useState(() => searchPreset.specialty ?? "any");
  const [city, setCity] = useState("any");
  const [maxFee, setMaxFee] = useState("any");
  const [availableToday, setAvailableToday] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [specialties, setSpecialties] = useState<SpecialtyInfo[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [items, setItems] = useState<DoctorCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  const searchSeq = useRef(0);

  const buildUrl = () => {
    const params = new URLSearchParams({ page: "1", pageSize: "24" });
    if (query.trim()) params.set("q", query.trim());
    if (specialty !== "any") params.set("specialty", specialty);
    if (city !== "any") params.set("city", city);
    if (maxFee !== "any") params.set("maxFee", maxFee);
    if (availableToday) params.set("availableToday", "true");
    if (verifiedOnly) params.set("verified", "true");
    return `/api/v1/doctors?${params.toString()}`;
  };

  // Async-only search: state updates happen in promise continuations (never
  // synchronously inside an effect), with a sequence guard against races.
  const search = () => {
    const seq = ++searchSeq.current;
    apiGet<{ items: DoctorCard[]; total: number }>(buildUrl())
      .then((d) => {
        if (seq !== searchSeq.current) return;
        setItems(d.items);
        setTotal(d.total);
      })
      .catch(() => {
        if (seq !== searchSeq.current) return;
        setFailed(true);
      });
  };

  useEffect(() => {
    apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
      .then((d) => setSpecialties(d.items))
      .catch(() => setSpecialties([]));
    apiGet<{ cities: CityOption[] }>("/api/v1/meta")
      .then((d) =>
        setCities(d.cities.map((c) => c.name).filter(Boolean))
      )
      .catch(() => setCities([]));
    // Consume the one-time preset handed over from Home/Specialties.
    clearSearchPreset();
  }, []);

  useEffect(() => {
    search();
  }, [specialty, city, maxFee, availableToday, verifiedOnly]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("search.title")}
        subtitle={
          items !== null ? t("search.results", { count: total }) : undefined
        }
      />

      {/* Search bar */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-11 rounded-xl pl-9"
            aria-label={t("search.placeholder")}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl px-3"
          onClick={() => setShowFilters((v) => !v)}
          aria-pressed={showFilters}
          aria-label={t("search.filters")}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </form>

      {/* Quick chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAvailableToday((v) => !v)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            availableToday
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40"
          )}
          aria-pressed={availableToday}
        >
          {t("search.availableToday")}
        </button>
        <button
          onClick={() => setVerifiedOnly((v) => !v)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            verifiedOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40"
          )}
          aria-pressed={verifiedOnly}
        >
          {t("search.verifiedOnly")}
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters ? (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("search.specialty")}
            </label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("search.anySpecialty")}</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("search.city")}
            </label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("search.anyCity")}</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("search.maxFee")}
            </label>
            <Select value={maxFee} onValueChange={setMaxFee}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="500">Up to ৳500</SelectItem>
                <SelectItem value="800">Up to ৳800</SelectItem>
                <SelectItem value="1200">Up to ৳1,200</SelectItem>
                <SelectItem value="2000">Up to ৳2,000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {/* Results */}
      {failed ? (
        <ErrorState onRetry={search} />
      ) : items === null ? (
        <LoadingCard rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t("search.noResults")}
          hint={t("search.noResultsHint")}
        />
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <article
              key={d.id}
              className="card-lift rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-start gap-x-3.5 gap-y-2">
                <button
                  className="shrink-0 rounded-full"
                  onClick={() => pushPatient({ name: "doctor", slug: d.slug })}
                  aria-label={d.name}
                >
                  <UserAvatar
                    name={d.name}
                    photoUrl={d.photoUrl}
                    className="h-14 w-14"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="min-w-0 truncate text-sm font-bold text-foreground hover:text-primary"
                      onClick={() =>
                        pushPatient({ name: "doctor", slug: d.slug })
                      }
                    >
                      {d.name}
                    </button>
                    {d.verificationStatus === "VERIFIED" ? (
                      <VerificationBadge status="VERIFIED" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {d.specialties.map((s) => s.name).join(" · ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <Stars rating={d.ratingAvg} count={d.ratingCount} />
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {d.city}
                    </span>
                    <span>{t("search.yearsExperience", { years: d.experienceYears })}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {d.nextAvailableLabel ? (
                      <Badge
                        variant="outline"
                        className="border-secondary/40 bg-secondary/10 text-[11px] font-semibold text-secondary"
                      >
                        <CalendarCheck className="mr-1 h-3 w-3" />
                        {t("search.nextAvailable", {
                          when: d.nextAvailableLabel,
                        })}
                      </Badge>
                    ) : null}
                    {d.requiresApproval ? null : (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary-soft text-[11px] font-semibold text-primary"
                      >
                        Instant booking
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex w-full flex-row items-center justify-between gap-2 self-stretch sm:w-auto sm:shrink-0 sm:flex-col sm:items-end sm:justify-between">
                  <div className="min-w-0 text-right">
                    <Money
                      amount={d.consultationFee}
                      currency={d.currency}
                      className="text-base font-bold text-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("doctor.newPatient")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-11 rounded-xl sm:h-8"
                    onClick={() => pushPatient({ name: "doctor", slug: d.slug })}
                  >
                    {t("search.viewProfile")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
