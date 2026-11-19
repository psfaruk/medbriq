"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Info,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Stethoscope,
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

const STAT_DEFS: {
  label: string;
  icon: LucideIcon;
  value: (meta: MetaPayload) => number;
}[] = [
  {
    label: "Verified doctors",
    icon: ShieldCheck,
    value: (meta) => meta.platformStats.verifiedDoctors,
  },
  {
    label: "Specialties",
    icon: Stethoscope,
    value: (meta) => meta.platformStats.specialties,
  },
  { label: "Cities", icon: MapPin, value: (meta) => meta.cities.length },
  {
    label: "Hospitals",
    icon: Building2,
    value: (meta) => meta.platformStats.hospitals,
  },
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

  useEffect(() => {
    // Kick off loads asynchronously — the loaders set loading flags
    // synchronously, which is not allowed directly in an effect body
    // (react-hooks/set-state-in-effect).
    void (async () => {
      await Promise.resolve();
      loadSpecialties();
      loadMeta();
      loadFeatured();
    })();
  }, [loadSpecialties, loadMeta, loadFeatured]);

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

  return (
    <div>
      {/* -------------------------------------------------------------- */}
      {/* Hero: headline + search card + emergency line + stats strip     */}
      {/* -------------------------------------------------------------- */}
      <section className="bg-gradient-to-b from-primary-soft/70 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/30 bg-background/70 px-3 py-1 text-sm font-medium text-primary"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Verified doctor discovery · Bangladesh demo
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Find trusted doctors near you
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Search verified specialists, compare fees and chambers, and book
              appointments — instantly or with doctor approval.
            </p>
          </div>

          <Card className="mt-8 max-w-3xl shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <form role="search" aria-label="Find doctors" onSubmit={submitSearch}>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={keywordInput}
                    onChange={(event) => setKeywordInput(event.target.value)}
                    placeholder="Doctor name, specialty, hospital…"
                    aria-label="Search by doctor name, specialty or hospital"
                    className="h-10 pl-9"
                    autoComplete="off"
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div className="grid gap-1.5">
                    <Label htmlFor="home-specialty">Specialty</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger id="home-specialty" className="h-10 w-full">
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
                    <Label htmlFor="home-city">City</Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger id="home-city" className="h-10 w-full">
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
                  <Button type="submit" size="lg" className="gap-2">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STAT_DEFS.map((stat) => (
              <Card key={stat.label} className="py-4">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <stat.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    {meta ? (
                      <p className="text-2xl font-bold leading-tight">
                        {stat.value(meta)}
                      </p>
                    ) : metaFailed ? (
                      <p className="text-2xl font-bold leading-tight">—</p>
                    ) : (
                      <Skeleton className="h-7 w-12" />
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Browse by specialty                                             */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-specialties-heading"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <h2
          id="home-specialties-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          Browse by specialty
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Jump straight to the care you need.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {specialties === null && !specialtiesFailed
            ? Array.from({ length: 10 }).map((_, index) => (
                <Card key={index} className="py-4">
                  <CardContent className="flex flex-col items-start gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : null}
          {(specialties ?? []).map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => browseSpecialty(item.slug)}
              aria-label={`Browse ${item.name} doctors`}
              className="group h-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="h-full gap-3 py-4 transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
                <CardContent className="flex h-full flex-col items-start gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <SpecialtyIcon icon={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
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
                    <span className="block text-xs text-muted-foreground">
                      {item.doctorCount} doctors
                    </span>
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
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
          className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="home-featured-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Featured verified doctors
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Top-rated verified specialists, ready to book.
              </p>
            </div>
            <Button
              variant="ghost"
              className="gap-1.5"
              onClick={() => navigate({ name: "search" })}
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured === null
              ? Array.from({ length: 6 }).map((_, index) => (
                  <DoctorCardSkeleton key={index} />
                ))
              : null}
            {featured?.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>

          {featured !== null && featured.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No verified doctors to feature yet.
            </p>
          ) : null}
        </section>
      )}

      {/* -------------------------------------------------------------- */}
      {/* How it works                                                    */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-how-heading"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <div className="rounded-3xl bg-muted/50 p-6 sm:p-10">
          <h2
            id="home-how-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            How it works
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            From search to visit in three steps.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.title} className="flex flex-col gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Trust section                                                   */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-trust-heading"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2
              id="home-trust-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Trust built on verification
            </h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Every doctor submits their BMDC registration details when they
                create a profile on Medbriq.
              </p>
              <p>
                Our admin team reviews each submission carefully before the
                Verified badge appears. Pending doctors are clearly labeled and
                cannot be booked while under review.
              </p>
              <p>
                Reviews come only from registered patients, so ratings reflect
                real appointment experiences.
              </p>
            </div>
          </div>
          <Card className="h-fit py-5">
            <CardContent className="flex flex-col gap-3 p-5">
              <p className="flex items-center gap-2 font-semibold">
                <Info className="h-5 w-5 text-primary" aria-hidden="true" />
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
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Doctor CTA band                                                 */}
      {/* -------------------------------------------------------------- */}
      <section
        aria-labelledby="home-doctor-cta-heading"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <Card className="border-primary bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2
                id="home-doctor-cta-heading"
                className="text-xl font-semibold sm:text-2xl"
              >
                Are you a doctor?
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-primary-foreground/85">
                Reach more patients with a verified profile, flexible chamber
                hours, and approval-based booking.
              </p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="shrink-0 gap-2"
              onClick={() => navigate({ name: "auth" })}
            >
              Register as a doctor
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
