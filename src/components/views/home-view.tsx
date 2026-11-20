"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Info,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DoctorCard,
  DoctorCardSkeleton,
} from "@/components/doctors/doctor-card";
import { SpecialtyIcon } from "@/components/doctors/specialty-icon";
import { useAppStore } from "@/lib/store";
import { BD_EMERGENCY_NUMBER } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type {
  ApiResult,
  DoctorCard as DoctorCardData,
  HospitalInfo,
  SpecialtyInfo,
} from "@/lib/types";

/** GET /api/v1/meta response payload (only the fields this view consumes). */
type MetaPayload = {
  cities: string[];
  languages: { code: string; label: string }[];
  platformStats: {
    verifiedDoctors: number;
    pendingDoctors: number;
    specialties: number;
    hospitals: number;
  };
};

/** GET /api/v1/doctors list envelope. */
type DoctorsPage = {
  items: DoctorCardData[];
  total: number;
  page: number;
  pageSize: number;
};

/** Fetch a Medbriq API endpoint and unwrap the { ok, data } envelope. */
async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!res.ok || !json || !json.ok) {
    throw new Error(
      json && json.ok === false
        ? json.error.message
        : `Request failed with status ${res.status}.`
    );
  }
  return json.data;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

/* ---------------------------------------------------------------------- */
/* Motion helpers                                                          */
/* ---------------------------------------------------------------------- */

/** Fade-up reveal once the element scrolls into view. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Animated number that counts up when scrolled into view. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || value <= 0) return;
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

/* ---------------------------------------------------------------------- */
/* Static content                                                          */
/* ---------------------------------------------------------------------- */

const STAT_DEFS: {
  label: string;
  icon: LucideIcon;
  iconClass: string;
  value: (meta: MetaPayload) => number;
}[] = [
  {
    label: "Verified doctors",
    icon: ShieldCheck,
    iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    value: (meta) => meta.platformStats.verifiedDoctors,
  },
  {
    label: "Specialties",
    icon: Stethoscope,
    iconClass: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    value: (meta) => meta.platformStats.specialties,
  },
  {
    label: "Cities",
    icon: MapPin,
    iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    value: (meta) => meta.cities.length,
  },
  {
    label: "Hospitals",
    icon: Building2,
    iconClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    value: (meta) => meta.platformStats.hospitals,
  },
];

/** Rotating tile palettes for specialty cards (no blue per brand rules). */
const TILE_STYLES = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
  "bg-lime-100 text-lime-700 dark:bg-lime-950/70 dark:text-lime-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300",
];

const HOW_IT_WORKS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Search,
    title: "Search & compare",
    text: "Filter by specialty, city, fees, language and video availability.",
  },
  {
    icon: CalendarClock,
    title: "Pick a time slot",
    text: "Live weekly chamber schedules, shown in Asia/Dhaka time.",
  },
  {
    icon: Stethoscope,
    title: "Book & visit",
    text: "Instant confirmation or doctor approval — with a trackable booking reference.",
  },
];

const TRUST_POINTS = [
  "Every doctor submits BMDC registration details when they create a profile.",
  "Our admin team reviews each submission before the Verified badge appears.",
  "Pending doctors are clearly labeled and cannot be booked while under review.",
  "Reviews come only from registered patients — real appointment experiences.",
];

/**
 * Hospital directory card. The whole card navigates to a city-filtered search
 * via a stretched button; the phone number stays a real tel: link above it.
 */
function HospitalCard({
  hospital,
  onSelect,
}: {
  hospital: HospitalInfo;
  onSelect: (hospital: HospitalInfo) => void;
}) {
  return (
    <Card className="group card-lift relative h-full gap-3 py-4 hover:border-primary/40">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-950 dark:to-teal-950 dark:text-emerald-300">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <Badge className="bg-primary-soft text-primary hover:bg-primary-soft border-0">
            {hospital.doctorCount}{" "}
            {hospital.doctorCount === 1 ? "doctor" : "doctors"}
          </Badge>
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="truncate font-semibold">{hospital.name}</p>
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="line-clamp-2">
              {hospital.city}
              {hospital.address ? ` · ${hospital.address}` : ""}
            </span>
          </p>
          {hospital.phone && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <PhoneCall
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <a
                href={`tel:${hospital.phone}`}
                className="relative z-10 font-medium hover:text-primary hover:underline"
              >
                {hospital.phone}
              </a>
            </p>
          )}
          {hospital.about && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {hospital.about}
            </p>
          )}
        </div>
      </CardContent>
      <button
        type="button"
        onClick={() => onSelect(hospital)}
        aria-label={`Browse doctors in ${hospital.city} — ${hospital.name}`}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </Card>
  );
}

function HospitalCardSkeleton() {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------------- */
/* Home view                                                               */
/* ---------------------------------------------------------------------- */

export default function HomeView() {
  const navigate = useAppStore((state) => state.navigate);
  const setSearchFilters = useAppStore((state) => state.setSearchFilters);
  const { toast } = useToast();

  // Hero search inputs ("all" is the sentinel for the unfiltered option).
  const [keywordInput, setKeywordInput] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [city, setCity] = useState("all");

  // Section data.
  const [specialties, setSpecialties] = useState<SpecialtyInfo[] | null>(null);
  const [specialtiesFailed, setSpecialtiesFailed] = useState(false);
  const [meta, setMeta] = useState<MetaPayload | null>(null);
  const [metaFailed, setMetaFailed] = useState(false);
  const [featured, setFeatured] = useState<DoctorCardData[] | null>(null);
  const [featuredFailed, setFeaturedFailed] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalInfo[] | null>(null);
  const [hospitalsFailed, setHospitalsFailed] = useState(false);

  const loadSpecialties = useCallback(async () => {
    setSpecialtiesFailed(false);
    try {
      const data = await fetchApi<{ items: SpecialtyInfo[] }>(
        "/api/v1/specialties"
      );
      setSpecialties(data.items);
    } catch (err) {
      setSpecialtiesFailed(true);
      toast({
        variant: "destructive",
        title: "Could not load specialties",
        description: errorMessage(err),
      });
    }
  }, [toast]);

  const loadMeta = useCallback(async () => {
    setMetaFailed(false);
    try {
      setMeta(await fetchApi<MetaPayload>("/api/v1/meta"));
    } catch (err) {
      setMetaFailed(true);
      toast({
        variant: "destructive",
        title: "Could not load platform data",
        description: errorMessage(err),
      });
    }
  }, [toast]);

  const loadFeatured = useCallback(async () => {
    setFeaturedFailed(false);
    try {
      const data = await fetchApi<DoctorsPage>(
        "/api/v1/doctors?verified=true&sort=rating&pageSize=6"
      );
      setFeatured(data.items);
    } catch (err) {
      // Spec: the featured section degrades silently on failure — log only.
      console.error("[HomeView] Failed to load featured doctors:", err);
      setFeaturedFailed(true);
    }
  }, []);

  const loadHospitals = useCallback(async () => {
    setHospitalsFailed(false);
    try {
      const data = await fetchApi<{ items: HospitalInfo[] }>(
        "/api/v1/hospitals"
      );
      setHospitals(data.items);
    } catch (err) {
      // Spec: the hospitals section degrades silently on failure — log only.
      console.error("[HomeView] Failed to load hospitals:", err);
      setHospitalsFailed(true);
    }
  }, []);

  useEffect(() => {
    // Kick off loads asynchronously — the loaders set loading flags
    // synchronously, which is not allowed directly in an effect body
    // (react-hooks/set-state-in-effect).
    void (async () => {
      await Promise.resolve();
      loadSpecialties();
      loadMeta();
      loadFeatured();
      loadHospitals();
    })();
  }, [loadSpecialties, loadMeta, loadFeatured, loadHospitals]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchFilters({
      q: keywordInput.trim() || undefined,
      specialty: specialty === "all" ? undefined : specialty,
      city: city === "all" ? undefined : city,
    });
    navigate({ name: "search" });
  };

  const browseSpecialty = (slug: string) => {
    setSearchFilters({ specialty: slug });
    navigate({ name: "search" });
  };

  const browseHospital = (hospital: HospitalInfo) => {
    setSearchFilters({ city: hospital.city });
    navigate({ name: "search" });
  };

  return (
    <div>
      {/* -------------------------------------------------------------- */}
      {/* Hero: headline + search + illustration                          */}
      {/* -------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-hero-mesh">
        {/* decorative blobs */}
        <div
          className="blob h-72 w-72 bg-emerald-300/50 -top-20 -right-16"
          aria-hidden="true"
        />
        <div
          className="blob h-64 w-64 bg-teal-200/40 bottom-0 -left-20"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left: copy + search */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge className="gap-1.5 border-primary/25 bg-card px-3 py-1 text-sm font-medium text-primary shadow-sm">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Verified doctor discovery · Bangladesh
                </Badge>
                <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[3.4rem] lg:leading-[1.08]">
                  Find <span className="text-gradient">trusted doctors</span>{" "}
                  near you
                </h1>
                <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
                  Search verified specialists, compare fees and chambers, and
                  book appointments — instantly or with doctor approval.
                </p>
                <p lang="bn" className="mt-2 max-w-xl text-sm font-medium text-foreground/75">
                  বিশ্বস্ত ডাক্তার খুঁজুন, ফি ও চেম্বার তুলনা করুন, সহজেই
                  অ্যাপয়েন্টমেন্ট নিন।
                </p>
              </motion.div>

              {/* Search card */}
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
              >
                <Card className="mt-7 max-w-2xl border-border/80 shadow-lg shadow-emerald-900/5">
                  <CardContent className="p-4 sm:p-5">
                    <form role="search" aria-label="Find doctors" onSubmit={submitSearch}>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
                          aria-hidden="true"
                        />
                        <Input
                          value={keywordInput}
                          onChange={(event) => setKeywordInput(event.target.value)}
                          placeholder="Doctor name, specialty, hospital…"
                          aria-label="Search by doctor name, specialty or hospital"
                          className="h-11 border-border/80 bg-secondary/50 pl-10 focus-visible:ring-primary/40"
                          autoComplete="off"
                        />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div className="grid gap-1.5">
                          <Label htmlFor="home-specialty" className="text-xs font-medium text-muted-foreground">
                            Specialty
                          </Label>
                          <Select value={specialty} onValueChange={setSpecialty}>
                            <SelectTrigger id="home-specialty" className="h-11 w-full">
                              <SelectValue placeholder="All specialties" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All specialties</SelectItem>
                              {(specialties ?? []).map((item) => (
                                <SelectItem key={item.slug} value={item.slug}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="home-city" className="text-xs font-medium text-muted-foreground">
                            City
                          </Label>
                          <Select value={city} onValueChange={setCity}>
                            <SelectTrigger id="home-city" className="h-11 w-full">
                              <SelectValue placeholder="All cities" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All cities</SelectItem>
                              {(meta?.cities ?? []).map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="submit"
                          size="lg"
                          className="h-11 gap-2 bg-brand-gradient px-6 text-primary-foreground shadow-md shadow-emerald-900/15 transition-all hover:shadow-lg hover:brightness-105"
                        >
                          <Search className="h-4 w-4" aria-hidden="true" />
                          Search
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Trust chips + emergency */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="mt-5 flex flex-wrap items-center gap-2"
              >
                {[
                  { icon: BadgeCheck, label: "BMDC-verified profiles" },
                  { icon: Zap, label: "Instant confirmation" },
                  { icon: CheckCircle2, label: "No booking fees" },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/80 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur"
                  >
                    <chip.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {chip.label}
                  </span>
                ))}
              </motion.div>

              <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <PhoneCall
                  className="h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <span>
                  Medical emergency? Call{" "}
                  <a
                    href={`tel:${BD_EMERGENCY_NUMBER}`}
                    className="font-semibold text-destructive hover:underline"
                  >
                    {BD_EMERGENCY_NUMBER}
                  </a>{" "}
                  — Bangladesh national emergency number.
                </span>
              </p>
            </div>

            {/* Right: illustration + floating cards (desktop & mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative mx-auto w-full max-w-sm lg:max-w-none"
            >
              <div className="relative overflow-hidden rounded-3xl border border-primary/10 shadow-xl shadow-emerald-900/10">
                <Image
                  src="/images/hero-doctor.png"
                  alt="Illustration of a friendly verified doctor welcoming patients"
                  width={560}
                  height={746}
                  priority
                  className="h-auto w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/15 via-transparent to-transparent" />
              </div>

              {/* floating: verified badge */}
              <div className="animate-float absolute -left-3 top-8 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:-left-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">BMDC Verified</p>
                  <p className="text-[11px] text-muted-foreground">
                    Admin-reviewed profiles
                  </p>
                </div>
              </div>

              {/* floating: rating */}
              <div className="animate-float-slow absolute -right-3 top-1/3 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:-right-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Star className="h-5 w-5 fill-current" aria-hidden="true" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">4.8 / 5</p>
                  <p className="text-[11px] text-muted-foreground">
                    Patient ratings
                  </p>
                </div>
              </div>

              {/* floating: booking */}
              <div className="animate-float absolute -bottom-4 left-8 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-3.5 py-2.5 shadow-lg backdrop-blur [animation-delay:1.2s]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  <CalendarClock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Same-day slots</p>
                  <p className="text-[11px] text-muted-foreground">
                    Live chamber schedules
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats strip */}
          <Reveal className="mt-14 sm:mt-16">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {STAT_DEFS.map((stat) => (
                <Card key={stat.label} className="card-lift border-border/70 py-4">
                  <CardContent className="flex items-center gap-3.5 p-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
                    >
                      <stat.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      {meta ? (
                        <p className="text-2xl font-bold leading-tight tracking-tight">
                          <CountUp value={stat.value(meta)} />
                          <span className="text-primary">+</span>
                        </p>
                      ) : metaFailed ? (
                        <p className="text-2xl font-bold leading-tight">—</p>
                      ) : (
                        <Skeleton className="h-7 w-12" />
                      )}
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Browse by specialty                                             */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-specialties-heading"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="home-specialties-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Browse by specialty
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Jump straight to the care you need.
              </p>
            </div>
            <Button
              variant="ghost"
              className="gap-1.5 text-primary hover:text-primary"
              onClick={() => navigate({ name: "search" })}
            >
              All specialties
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Reveal>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {specialties === null && !specialtiesFailed
            ? Array.from({ length: 10 }).map((_, index) => (
                <Card key={index} className="py-4">
                  <CardContent className="flex flex-col items-start gap-3 p-4">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : null}
          {(specialties ?? []).map((item, index) => {
            const tile = TILE_STYLES[index % TILE_STYLES.length];
            return (
              <Reveal key={item.slug} delay={Math.min(index * 0.04, 0.3)}>
                <button
                  type="button"
                  onClick={() => browseSpecialty(item.slug)}
                  aria-label={`Browse ${item.name} doctors`}
                  className="group h-full w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Card className="card-lift h-full gap-3 py-4 group-hover:border-primary/40">
                    <CardContent className="flex h-full flex-col items-start gap-3 p-4">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${tile}`}
                      >
                        <SpecialtyIcon icon={item.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        {item.nameBn ? (
                          <span
                            lang="bn"
                            className="block truncate text-xs text-muted-foreground"
                          >
                            {item.nameBn}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block text-xs font-medium text-primary">
                          {item.doctorCount}{" "}
                          {item.doctorCount === 1 ? "doctor" : "doctors"}
                        </span>
                      </span>
                    </CardContent>
                  </Card>
                </button>
              </Reveal>
            );
          })}
        </div>

        {specialtiesFailed ? (
          <div className="mt-5 flex flex-col items-start gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <span>Could not load specialties right now.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadSpecialties()}
            >
              Try again
            </Button>
          </div>
        ) : null}
        {specialties !== null && specialties.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No specialties are listed yet. Please check back later.
          </p>
        ) : null}
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Featured verified doctors                                       */}
      {/* -------------------------------------------------------------- */}
      {featuredFailed ? null : (
        <section
          aria-labelledby="home-featured-heading"
          className="bg-brand-gradient-soft border-y border-primary/10 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="home-featured-heading"
                    className="text-2xl font-bold tracking-tight sm:text-3xl"
                  >
                    Featured verified doctors
                  </h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Top-rated verified specialists, ready to book.
                  </p>
                </div>
                <Button
                  className="gap-1.5 bg-brand-gradient text-primary-foreground shadow-md hover:brightness-105"
                  onClick={() => navigate({ name: "search" })}
                >
                  View all
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </Reveal>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured === null
                ? Array.from({ length: 6 }).map((_, index) => (
                    <DoctorCardSkeleton key={index} />
                  ))
                : null}
              {featured?.map((doctor, index) => (
                <Reveal key={doctor.id} delay={Math.min(index * 0.06, 0.3)}>
                  <DoctorCard doctor={doctor} />
                </Reveal>
              ))}
            </div>

            {featured !== null && featured.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                No verified doctors to feature yet.
              </p>
            ) : null}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Hospitals & clinics                                             */}
      {/* -------------------------------------------------------------- */}
      {(hospitals === null && !hospitalsFailed) ||
      (hospitals !== null && hospitals.length > 0) ? (
        <section
          aria-labelledby="home-hospitals-heading"
          className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
        >
          <Reveal>
            <h2
              id="home-hospitals-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Hospitals &amp; clinics
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Browse doctors by where they practice.
            </p>
          </Reveal>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals === null
              ? Array.from({ length: 6 }).map((_, index) => (
                  <HospitalCardSkeleton key={index} />
                ))
              : hospitals.map((hospital, index) => (
                  <Reveal key={hospital.id} delay={Math.min(index * 0.06, 0.3)}>
                    <HospitalCard
                      hospital={hospital}
                      onSelect={browseHospital}
                    />
                  </Reveal>
                ))}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- */}
      {/* How it works                                                    */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-how-heading"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary-soft/80 via-card to-teal-50/60 dark:via-card dark:to-teal-950/30 p-6 sm:p-10">
            <div
              className="blob h-56 w-56 bg-emerald-200/40 -top-16 -right-10"
              aria-hidden="true"
            />
            <h2
              id="home-how-heading"
              className="relative text-2xl font-bold tracking-tight sm:text-3xl"
            >
              How it works
            </h2>
            <p className="relative mt-1.5 text-sm text-muted-foreground">
              From search to visit in three steps.
            </p>
            <div className="relative mt-8 grid gap-8 sm:grid-cols-3">
              {/* connector line (desktop) */}
              <div
                className="pointer-events-none absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-primary/25 sm:block"
                aria-hidden="true"
              />
              {HOW_IT_WORKS.map((step, index) => (
                <div key={step.title} className="relative flex flex-col gap-4">
                  <span className="bg-brand-gradient relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-md shadow-emerald-900/20">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-amber-950">
                      {index + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Trust section                                                   */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-trust-heading"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <h2
              id="home-trust-heading"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Trust built on <span className="text-gradient">verification</span>
            </h2>
            <ul className="mt-5 space-y-3.5">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="h-fit border-amber-200/60 bg-amber-50/60 py-5 dark:bg-amber-950/20">
              <CardContent className="flex flex-col gap-3 p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <Info className="h-5 w-5 text-amber-600" aria-hidden="true" />
                  Demo environment notice
                </p>
                <p className="text-sm text-muted-foreground">
                  You&apos;re browsing a demo MVP. Doctor profiles, hospitals and
                  reviews in this environment are illustrative sample data — not
                  real people or medical claims.
                </p>
                <p className="text-sm text-muted-foreground">
                  For emergencies always call{" "}
                  <strong className="text-foreground">
                    {BD_EMERGENCY_NUMBER}
                  </strong>
                  .
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Doctor CTA band                                                 */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-doctor-cta-heading"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <Reveal>
          <div className="bg-brand-gradient relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl shadow-emerald-900/20 sm:p-10">
            <div
              className="blob h-64 w-64 bg-white/25 -top-24 -right-16"
              aria-hidden="true"
            />
            <div
              className="blob h-48 w-48 bg-amber-300/30 bottom-0 -left-10"
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2
                  id="home-doctor-cta-heading"
                  className="text-2xl font-bold sm:text-3xl"
                >
                  Are you a doctor?
                </h2>
                <p className="mt-2 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
                  Reach more patients with a verified profile, flexible chamber
                  hours, and approval-based booking. Set your own new &amp;
                  returning patient fees.
                </p>
              </div>
              <Button
                size="lg"
                className="shrink-0 gap-2 bg-white text-emerald-800 shadow-lg hover:bg-emerald-50"
                onClick={() => navigate({ name: "auth" })}
              >
                Register as a doctor
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
