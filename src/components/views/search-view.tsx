"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  DoctorCard,
  DoctorCardSkeleton,
} from "@/components/doctors/doctor-card";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type {
  ApiResult,
  DoctorCard as DoctorCardData,
  SearchFilters,
  SpecialtyInfo,
} from "@/lib/types";

const PAGE_SIZE = 12;
const KEYWORD_DEBOUNCE_MS = 400;

/** Sentinel select values (Radix Select forbids empty-string item values). */
const OPTION_ALL = "all";

const MAX_FEE_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Any fee" },
  { value: "500", label: "৳500" },
  { value: "800", label: "৳800" },
  { value: "1000", label: "৳1,000" },
  { value: "1500", label: "৳1,500" },
  { value: "2000", label: "৳2,000" },
  { value: "3000", label: "৳3,000+" },
];

/** GET /api/v1/meta payload (only the filter option fields). */
type MetaPayload = {
  cities: string[];
  languages: { code: string; label: string }[];
};

/** GET /api/v1/doctors list envelope. */
type DoctorsPage = {
  items: DoctorCardData[];
  total: number;
  page: number;
  pageSize: number;
};

/** Local, UI-facing filter state (strings + booleans for controlled inputs). */
type LocalFilters = {
  q: string;
  specialty: string;
  city: string;
  language: string;
  maxFee: string;
  verified: boolean;
  video: boolean;
  availableToday: boolean;
};

const EMPTY_FILTERS: LocalFilters = {
  q: "",
  specialty: "",
  city: "",
  language: "",
  maxFee: "any",
  verified: false,
  video: false,
  availableToday: false,
};

/** Store (SearchFilters) -> local UI state. */
function filtersFromStore(filters: SearchFilters): LocalFilters {
  return {
    q: filters.q ?? "",
    specialty: filters.specialty ?? "",
    city: filters.city ?? "",
    language: filters.language ?? "",
    maxFee: filters.maxFee != null ? String(filters.maxFee) : "any",
    verified: filters.verifiedOnly ?? false,
    video: filters.video ?? false,
    availableToday: filters.availableToday ?? false,
  };
}

/** Local UI state -> store (SearchFilters), omitting inactive fields. */
function storeFromFilters(filters: LocalFilters): SearchFilters {
  return {
    q: filters.q || undefined,
    specialty: filters.specialty || undefined,
    city: filters.city || undefined,
    language: filters.language || undefined,
    maxFee: filters.maxFee !== "any" ? Number(filters.maxFee) : undefined,
    verifiedOnly: filters.verified || undefined,
    video: filters.video || undefined,
    availableToday: filters.availableToday || undefined,
  };
}

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

type FilterPanelProps = {
  idPrefix: string;
  filters: LocalFilters;
  specialties: SpecialtyInfo[];
  cities: string[];
  languages: { code: string; label: string }[];
  optionsFailed: boolean;
  onRetryOptions: () => void;
  onUpdate: (patch: Partial<LocalFilters>) => void;
  onClear: () => void;
  hasActive: boolean;
};

/** Filter controls shared by the desktop aside and the mobile sheet. */
function FilterPanel({
  idPrefix,
  filters,
  specialties,
  cities,
  languages,
  optionsFailed,
  onRetryOptions,
  onUpdate,
  onClear,
  hasActive,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {optionsFailed ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="text-muted-foreground">
            Could not load filter options.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetryOptions}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-keyword`}>Keyword</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={`${idPrefix}-keyword`}
            value={filters.q}
            onChange={(event) => onUpdate({ q: event.target.value })}
            placeholder="Name, specialty or hospital"
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-specialty`}>Specialty</Label>
        <Select
          value={filters.specialty || OPTION_ALL}
          onValueChange={(value) =>
            onUpdate({ specialty: value === OPTION_ALL ? "" : value })
          }
        >
          <SelectTrigger id={`${idPrefix}-specialty`} className="w-full">
            <SelectValue placeholder="All specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OPTION_ALL}>All specialties</SelectItem>
            {specialties.map((item) => (
              <SelectItem key={item.slug} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Select
          value={filters.city || OPTION_ALL}
          onValueChange={(value) =>
            onUpdate({ city: value === OPTION_ALL ? "" : value })
          }
        >
          <SelectTrigger id={`${idPrefix}-city`} className="w-full">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OPTION_ALL}>All cities</SelectItem>
            {cities.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-language`}>Language</Label>
        <Select
          value={filters.language || "any"}
          onValueChange={(value) =>
            onUpdate({ language: value === "any" ? "" : value })
          }
        >
          <SelectTrigger id={`${idPrefix}-language`} className="w-full">
            <SelectValue placeholder="Any language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any language</SelectItem>
            {languages.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-max-fee`}>Maximum fee</Label>
        <Select
          value={filters.maxFee}
          onValueChange={(value) => onUpdate({ maxFee: value })}
        >
          <SelectTrigger id={`${idPrefix}-max-fee`} className="w-full">
            <SelectValue placeholder="Any fee" />
          </SelectTrigger>
          <SelectContent>
            {MAX_FEE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-4 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${idPrefix}-verified`} className="text-sm">
            Verified only
          </Label>
          <Switch
            id={`${idPrefix}-verified`}
            checked={filters.verified}
            onCheckedChange={(checked) => onUpdate({ verified: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${idPrefix}-video`} className="text-sm">
            Video consultation
          </Label>
          <Switch
            id={`${idPrefix}-video`}
            checked={filters.video}
            onCheckedChange={(checked) => onUpdate({ video: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${idPrefix}-today`} className="text-sm">
            Available today
          </Label>
          <Switch
            id={`${idPrefix}-today`}
            checked={filters.availableToday}
            onCheckedChange={(checked) =>
              onUpdate({ availableToday: checked })
            }
          />
        </div>
      </div>

      {hasActive ? (
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={onClear}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

export default function SearchView() {
  const storeFilters = useAppStore((state) => state.searchFilters);
  const setSearchFilters = useAppStore((state) => state.setSearchFilters);
  const { toast } = useToast();

  // Local filter state, initialized from the store on mount.
  const [filters, setFilters] = useState<LocalFilters>(() =>
    filtersFromStore(useAppStore.getState().searchFilters)
  );
  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filter option data (specialty/city/language selects).
  const [specialties, setSpecialties] = useState<SpecialtyInfo[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [languages, setLanguages] = useState<{ code: string; label: string }[]>(
    []
  );
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [optionsRetryKey, setOptionsRetryKey] = useState(0);

  // Results.
  const [results, setResults] = useState<DoctorsPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  // Keep local state in sync when the store copy changes externally
  // (e.g. a specialty tile clicked on the home view).
  const lastStoreKey = useRef(
    JSON.stringify(useAppStore.getState().searchFilters)
  );
  useEffect(() => {
    const key = JSON.stringify(storeFilters);
    if (key !== lastStoreKey.current) {
      lastStoreKey.current = key;
      const incoming = filtersFromStore(storeFilters);
      setFilters(incoming);
      setDebouncedQ(incoming.q);
    }
  }, [storeFilters]);

  // Debounce the keyword input.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), KEYWORD_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.q]);

  // Load filter options once (retryable).
  useEffect(() => {
    let active = true;
    setOptionsFailed(false);
    const fail = () => {
      if (!active) return;
      setOptionsFailed(true);
      toast({
        variant: "destructive",
        title: "Could not load filter options",
        description: "Some filter lists may be incomplete. Please try again.",
      });
    };
    fetchApi<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
      .then((data) => {
        if (active) setSpecialties(data.items);
      })
      .catch(() => fail());
    fetchApi<MetaPayload>("/api/v1/meta")
      .then((data) => {
        if (!active) return;
        setCities(data.cities);
        setLanguages(data.languages);
      })
      .catch(() => fail());
    return () => {
      active = false;
    };
  }, [optionsRetryKey, toast]);

  // Query string for the current (debounced) filter values.
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    const q = debouncedQ.trim();
    if (q) params.set("q", q);
    if (filters.specialty) params.set("specialty", filters.specialty);
    if (filters.city) params.set("city", filters.city);
    if (filters.language) params.set("language", filters.language);
    if (filters.maxFee !== "any") params.set("maxFee", filters.maxFee);
    if (filters.verified) params.set("verified", "true");
    if (filters.video) params.set("video", "true");
    if (filters.availableToday) params.set("availableToday", "true");
    return params.toString();
  }, [
    debouncedQ,
    filters.specialty,
    filters.city,
    filters.language,
    filters.maxFee,
    filters.verified,
    filters.video,
    filters.availableToday,
  ]);

  // Fetch results. The page is reset to 1 whenever the query changes; a
  // request sequence number drops stale responses (debounce, fast paging).
  const keyRef = useRef(queryString);
  const seqRef = useRef(0);
  useEffect(() => {
    const keyChanged = keyRef.current !== queryString;
    if (keyChanged) {
      keyRef.current = queryString;
      if (page !== 1) {
        // Reset first; the page state update re-triggers this effect.
        setStatus("loading");
        setPage(1);
        return;
      }
    }
    const targetPage = keyChanged ? 1 : page;

    const seq = ++seqRef.current;
    setStatus("loading");

    const params = new URLSearchParams(queryString);
    params.set("page", String(targetPage));
    params.set("pageSize", String(PAGE_SIZE));

    fetch(`/api/v1/doctors?${params.toString()}`)
      .then((res) => res.json().catch(() => null))
      .then((json: ApiResult<DoctorsPage> | null) => {
        if (seq !== seqRef.current) return;
        if (!json || !json.ok) {
          setStatus("error");
          toast({
            variant: "destructive",
            title: "Could not load doctors",
            description:
              json && json.ok === false
                ? json.error.message
                : "Please try again in a moment.",
          });
          return;
        }
        setResults(json.data);
        setStatus("ready");
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        setStatus("error");
        toast({
          variant: "destructive",
          title: "Network error",
          description:
            "Could not reach the server. Please check your connection and try again.",
        });
      });
  }, [queryString, page, retryKey, toast]);

  const updateFilters = (patch: Partial<LocalFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    // Mirror into the store so filters survive view switches. The sync key is
    // bumped HERE so the store-sync effect recognizes this as a local change
    // and does not echo it back (which would bypass the keyword debounce by
    // applying q immediately on every keystroke).
    const mirrored = storeFromFilters(next);
    lastStoreKey.current = JSON.stringify(mirrored);
    setSearchFilters(mirrored);
  };

  const removeKeyword = () => {
    updateFilters({ q: "" });
    setDebouncedQ("");
  };

  const clearAllFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDebouncedQ("");
    const mirrored = storeFromFilters(EMPTY_FILTERS);
    lastStoreKey.current = JSON.stringify(mirrored);
    setSearchFilters(mirrored);
  };

  const specialtyLabel = (slug: string) =>
    specialties.find((item) => item.slug === slug)?.name ?? slug;
  const languageLabel = (code: string) =>
    languages.find((item) => item.code === code)?.label ?? code;

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q.trim()) {
    chips.push({
      key: "q",
      label: filters.q.trim(),
      remove: removeKeyword,
    });
  }
  if (filters.specialty) {
    chips.push({
      key: "specialty",
      label: specialtyLabel(filters.specialty),
      remove: () => updateFilters({ specialty: "" }),
    });
  }
  if (filters.city) {
    chips.push({
      key: "city",
      label: filters.city,
      remove: () => updateFilters({ city: "" }),
    });
  }
  if (filters.language) {
    chips.push({
      key: "language",
      label: languageLabel(filters.language),
      remove: () => updateFilters({ language: "" }),
    });
  }
  if (filters.maxFee !== "any") {
    chips.push({
      key: "maxFee",
      label: `≤ ৳ ${Number(filters.maxFee).toLocaleString("en-US")}`,
      remove: () => updateFilters({ maxFee: "any" }),
    });
  }
  if (filters.verified) {
    chips.push({
      key: "verified",
      label: "Verified",
      remove: () => updateFilters({ verified: false }),
    });
  }
  if (filters.video) {
    chips.push({
      key: "video",
      label: "Video",
      remove: () => updateFilters({ video: false }),
    });
  }
  if (filters.availableToday) {
    chips.push({
      key: "availableToday",
      label: "Available today",
      remove: () => updateFilters({ availableToday: false }),
    });
  }

  const totalPages =
    results && results.total > 0
      ? Math.max(1, Math.ceil(results.total / PAGE_SIZE))
      : 1;

  const panelProps = {
    filters,
    specialties,
    cities,
    languages,
    optionsFailed,
    onRetryOptions: () => setOptionsRetryKey((key) => key + 1),
    onUpdate: updateFilters,
    onClear: clearAllFilters,
    hasActive: chips.length > 0,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Find doctors
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by specialty, city, fees, language and video availability.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Desktop filter aside */}
        <aside className="hidden lg:block" aria-label="Search filters">
          <Card className="py-4 lg:sticky lg:top-20">
            <CardContent className="px-4">
              <FilterPanel idPrefix="desktop-filters" {...panelProps} />
            </CardContent>
          </Card>
        </aside>

        {/* Results column */}
        <section aria-label="Search results">
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
            {status === "loading" ? (
              <Skeleton className="h-5 w-36" />
            ) : status === "ready" && results ? (
              <p className="text-sm font-medium" aria-live="polite">
                {results.total} doctor{results.total === 1 ? "" : "s"} found
              </p>
            ) : null}

            {/* Mobile filters trigger */}
            <div className="lg:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Filters
                    {chips.length > 0 ? (
                      <Badge className="h-5 min-w-5 rounded-full px-1.5">
                        {chips.length}
                      </Badge>
                    ) : null}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-80 overflow-y-auto sm:max-w-sm"
                >
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Narrow down doctors by specialty, city, fees and more.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-6">
                    <FilterPanel idPrefix="mobile-filters" {...panelProps} />
                    <Button
                      className="mt-6 w-full"
                      onClick={() => setSheetOpen(false)}
                    >
                      Show results
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 ? (
            <ul
              className="mt-3 flex flex-wrap gap-2"
              aria-label="Active filters"
            >
              {chips.map((chip) => (
                <li key={chip.key}>
                  <button
                    type="button"
                    onClick={chip.remove}
                    aria-label={`Remove filter: ${chip.label}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="max-w-40 truncate">{chip.label}</span>
                    <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Results */}
          {status === "loading" ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <DoctorCardSkeleton key={index} />
              ))}
            </div>
          ) : status === "error" ? (
            <Card className="mt-5">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <CircleAlert
                  className="h-10 w-10 text-destructive"
                  aria-hidden="true"
                />
                <p className="font-medium">Could not load doctors</p>
                <p className="text-sm text-muted-foreground">
                  Something went wrong while fetching results. Please try
                  again.
                </p>
                <Button
                  variant="outline"
                  className="mt-1"
                  onClick={() => setRetryKey((key) => key + 1)}
                >
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : results && results.items.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.items.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          ) : (
            <Card className="mt-5">
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <SearchX
                  className="h-10 w-10 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="font-medium">No doctors match your filters</p>
                <p className="text-sm text-muted-foreground">
                  Try removing some filters or broadening your search.
                </p>
                <Button
                  variant="outline"
                  className="mt-1"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {status === "ready" && results && results.total > PAGE_SIZE ? (
            <nav
              className="mt-6 flex items-center justify-center gap-2"
              aria-label="Pagination"
            >
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <p className="px-2 text-sm text-muted-foreground" aria-live="polite">
                Page {page} of {totalPages}
              </p>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
