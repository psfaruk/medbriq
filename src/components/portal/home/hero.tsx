"use client";

/**
 * Portal hero (spec §3): headline, subcopy, unified search with live
 * suggestions (doctors / hospitals / specialties), city selector, primary
 * CTA (Find a Doctor) and secondary CTA (Join as a Healthcare Provider),
 * plus real platform stats. The hero image is NOT lazy-loaded (spec §15).
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  MapPin,
  ShieldCheck,
  Building2,
  Stethoscope,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/app-state";
import { track } from "@/lib/analytics";
import { useT } from "@/components/app/shared/ui-kit";
import { cn } from "@/lib/utils";
import { PortalLink, usePortalData, useTrackPageView } from "../shared";

type Suggestions = {
  doctors: { slug: string; name: string; specialty: string | null; city: string }[];
  hospitals: { slug: string; name: string; city: string }[];
  specialties: { slug: string; name: string }[];
};

type Meta = {
  cities: string[];
  platformStats: {
    verifiedDoctors: number;
    pendingDoctors: number;
    specialties: number;
    hospitals: number;
  };
};

export function PortalHero() {
  const { t } = useT();
  const setPortalView = useAppStore((s) => s.setPortalView);
  useTrackPageView("home");

  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const meta = usePortalData<Meta>("/api/v1/meta");

  // Debounced suggestion fetch (>= 2 chars). Never blocks the input; state
  // updates only inside the async timeout callback (no sync setState).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setSuggestions(null);
        return;
      }
      fetch(`/api/v1/search/suggest?q=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json?.ok) setSuggestions(json.data as Suggestions);
        })
        .catch(() => setSuggestions(null));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Close the suggestion panel on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const hasSuggestions =
    suggestions &&
    (suggestions.doctors.length > 0 ||
      suggestions.hospitals.length > 0 ||
      suggestions.specialties.length > 0);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    track("doctor_search");
    setPortalView(
      {
        name: "doctors",
        q: q.trim() || undefined,
        city: city === "all" ? undefined : city,
      },
      { push: true }
    );
  }

  const stats = meta.data?.platformStats;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft/70 via-accent/50 to-white">
      {/* colorful decorative shapes (CSS only — no image weight) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#13A89E]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-1/3 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-20 lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[#13A89E]/30 bg-[#13A89E]/10 px-3 py-1 text-xs font-semibold text-[#0f8f87]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t("portal.hero.badge")}
          </p>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("portal.hero.headline")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("portal.hero.sub")}
          </p>

          {/* Unified search */}
          <form
            onSubmit={submitSearch}
            role="search"
            aria-label="Doctor and hospital search"
            className="mt-7"
          >
            <div
              ref={boxRef}
              className="relative rounded-2xl border border-border bg-white p-2 shadow-soft"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setFocused(true)}
                    placeholder={t("portal.hero.searchPlaceholder")}
                    aria-label={t("portal.hero.searchPlaceholder")}
                    aria-expanded={focused && !!hasSuggestions}
                    aria-controls="hero-suggestions"
                    role="combobox"
                    autoComplete="off"
                    className="h-11 border-0 pl-9 text-base shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger
                      aria-label={t("portal.doctor.city")}
                      className="h-11 w-[130px] shrink-0 text-sm sm:w-[150px]"
                    >
                      <MapPin className="mr-1 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("portal.hero.allCities")}</SelectItem>
                      {(meta.data?.cities ?? []).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 shrink-0 px-5 font-semibold"
                  >
                    {t("portal.hero.findDoctor")}
                  </Button>
                </div>
              </div>

              {/* Suggestions dropdown */}
              {focused && hasSuggestions && (
                <div
                  id="hero-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
                >
                  {suggestions!.doctors.length > 0 && (
                    <SuggestionGroup label="Doctors">
                      {suggestions!.doctors.map((d) => (
                        <SuggestionRow
                          key={d.slug}
                          icon={<Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />}
                          title={d.name}
                          sub={[d.specialty, d.city].filter(Boolean).join(" · ")}
                          onClick={() => {
                            track("profile_view_doctor");
                            setPortalView({ name: "doctor", slug: d.slug }, { push: true });
                          }}
                        />
                      ))}
                    </SuggestionGroup>
                  )}
                  {suggestions!.hospitals.length > 0 && (
                    <SuggestionGroup label="Hospitals">
                      {suggestions!.hospitals.map((h) => (
                        <SuggestionRow
                          key={h.slug}
                          icon={<Building2 className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />}
                          title={h.name}
                          sub={h.city}
                          onClick={() =>
                            setPortalView({ name: "hospital", slug: h.slug }, { push: true })
                          }
                        />
                      ))}
                    </SuggestionGroup>
                  )}
                  {suggestions!.specialties.length > 0 && (
                    <SuggestionGroup label="Specialties">
                      {suggestions!.specialties.map((s) => (
                        <SuggestionRow
                          key={s.slug}
                          icon={<Activity className="h-4 w-4 text-primary" aria-hidden="true" />}
                          title={s.name}
                          onClick={() => {
                            track("doctor_search");
                            setPortalView(
                              { name: "doctors", specialty: s.slug },
                              { push: true }
                            );
                          }}
                        />
                      ))}
                    </SuggestionGroup>
                  )}
                </div>
              )}
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PortalLink
              view={{ name: "for-doctors" }}
              ctaLabel="hero-join-provider"
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("portal.hero.joinProvider")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </PortalLink>
          </div>

          {/* Real platform stats */}
          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4" aria-label="Platform statistics">
            <Stat
              value={stats ? String(stats.verifiedDoctors) : "—"}
              label={t("portal.hero.statVerified")}
            />
            <Stat
              value={stats ? String(stats.hospitals) : "—"}
              label={t("portal.hero.statHospitals")}
            />
            <Stat
              value={stats ? String(stats.specialties) : "—"}
              label={t("portal.hero.statSpecialties")}
            />
          </dl>
        </div>

        {/* Hero 3D illustration — eager (above the fold), fixed dimensions to prevent CLS */}
        <div className="relative mx-auto w-full max-w-sm lg:max-w-md" aria-hidden="true">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#13A89E]/30 via-amber-200/40 to-rose-200/40 blur-md" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-white shadow-soft">
            <Image
              src="/images/hero-3d-doctor.png"
              alt=""
              width={864}
              height={1152}
              priority
              sizes="(min-width: 1024px) 28rem, 90vw"
              className="h-auto w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
            <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
              Credential-reviewed doctor profiles
            </p>
          </div>
          <div className="absolute -right-3 top-6 rounded-2xl border border-border bg-white/95 px-3.5 py-2.5 shadow-soft backdrop-blur sm:-right-5">
            <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Live slot booking
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SuggestionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <p className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="pb-1.5">{children}</div>
    </div>
  );
}

function SuggestionRow({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onMouseDown={(e) => e.preventDefault()} // keep input focus
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-primary-soft/50 focus-visible:bg-primary-soft/50 focus-visible:outline-none"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{title}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-extrabold text-primary sm:text-3xl">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{label}</dd>
    </div>
  );
}

export default PortalHero;
