"use client";

/**
 * HomeScreen — greeting, hero banner, search entry, quick actions,
 * specialty chips, top-rated doctors and an upcoming-appointments preview.
 */

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  FolderHeart,
  LayoutGrid,
  Search,
  Stethoscope,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type {
  AppointmentDto,
  DoctorCard,
  SpecialtyInfo,
} from "@/lib/types";
import {
  AppointmentStatusBadge,
  DemoNotice,
  EmptyState,
  Money,
  PageHeader,
  SectionCard,
  Stars,
  UserAvatar,
  useT,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { setSearchPreset } from "../parts";

const QUICK_ACTIONS = [
  { key: "find", labelKey: "home.findDoctor", icon: Stethoscope, screen: { name: "doctors" } as const },
  { key: "bookings", labelKey: "home.myBookings", icon: CalendarCheck, screen: { name: "bookings" } as const },
  { key: "records", labelKey: "home.familyRecords", icon: FolderHeart, screen: { name: "records" } as const },
  { key: "specialties", labelKey: "home.specialties", icon: LayoutGrid, screen: { name: "specialties" } as const },
];

export default function HomeScreen() {
  const { t, lang } = useT();
  const user = useAppStore((s) => s.user);
  const resetPatient = useAppStore((s) => s.resetPatient);
  const pushPatient = useAppStore((s) => s.pushPatient);

  const [query, setQuery] = useState("");
  const [specialties, setSpecialties] = useState<SpecialtyInfo[] | null>(null);
  const [topDoctors, setTopDoctors] = useState<DoctorCard[] | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDto[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
      .then((d) => {
        if (active) setSpecialties(d.items);
      })
      .catch(() => {
        if (active) setSectionsError(true);
      });
    apiGet<{ items: DoctorCard[] }>(
      "/api/v1/doctors?sort=rating&pageSize=6&verified=true"
    )
      .then((d) => {
        if (active) setTopDoctors(d.items);
      })
      .catch(() => {
        if (active) setSectionsError(true);
      });
    apiGet<{ items: AppointmentDto[] }>("/api/v1/appointments")
      .then((d) => {
        if (active) setAppointments(d.items);
      })
      .catch(() => {
        if (active) setAppointments([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const upcoming = useMemo(
    () =>
      (appointments ?? [])
        .filter(
          (a) =>
            (a.status === "PENDING_APPROVAL" || a.status === "CONFIRMED") &&
            new Date(a.slotEnd).getTime() > Date.now()
        )
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
        .slice(0, 2),
    [appointments]
  );

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchPreset({ q: query.trim() });
    resetPatient({ name: "doctors" });
  };

  const openSpecialty = (slug: string) => {
    setSearchPreset({ specialty: slug });
    resetPatient({ name: "doctors" });
  };

  const firstName = (user?.name ?? "").split(" ")[0] || "there";

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("home.greeting", { name: firstName })}
        subtitle={t("home.howCanWeHelp")}
      />

      {/* ── Hero banner ─────────────────────────────────────────── */}
      <section className="rounded-2xl bg-brand-gradient p-5 sm:p-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">
              Book your next visit in minutes
            </h2>
            <p className="mt-1 max-w-md text-sm text-white/85">
              Transparent fees, verified doctors, instant or doctor-approved
              appointments across Bangladesh.
            </p>
          </div>
          <Button
            variant="secondary"
            className="w-full bg-white text-primary hover:bg-white/90 sm:w-auto"
            onClick={() => resetPatient({ name: "doctors" })}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {t("home.bookNow")}
          </Button>
        </div>
      </section>

      {/* ── Search ──────────────────────────────────────────────── */}
      <form
        onSubmit={submitSearch}
        role="search"
        className="flex gap-2"
        aria-label={t("common.search")}
      >
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("home.searchPlaceholder")}
            className="h-12 rounded-2xl border-border bg-card pl-9 shadow-soft"
            aria-label={t("home.searchPlaceholder")}
          />
        </div>
        <Button type="submit" className="h-12 rounded-2xl px-4">
          {t("common.search")}
        </Button>
      </form>

      {/* ── Quick actions ───────────────────────────────────────── */}
      <section aria-label={t("home.quickActions")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => resetPatient({ name: action.screen.name })}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-soft card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <action.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-foreground">
                {t(action.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Specialty chips ─────────────────────────────────────── */}
      <SectionCard
        title={t("home.specialties")}
        action={
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            onClick={() => pushPatient({ name: "specialties" })}
          >
            {t("common.viewAll")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }
      >
        {specialties === null ? (
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-muted"
              />
            ))}
          </div>
        ) : specialties.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto app-scroll pb-1">
            {specialties.slice(0, 12).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openSpecialty(s.slug)}
                className="shrink-0 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft/50"
              >
                {lang === "bn" && s.nameBn ? s.nameBn : s.name}
                <span className="ml-1.5 text-muted-foreground">
                  {s.doctorCount}
                </span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Upcoming appointments ───────────────────────────────── */}
      <SectionCard
        title={t("home.upcoming")}
        action={
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            onClick={() => resetPatient({ name: "bookings" })}
          >
            {t("common.viewAll")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }
      >
        {appointments === null ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            title={t("home.noUpcoming")}
            hint={t("appointments.emptyHint")}
            action={
              <Button size="sm" onClick={() => resetPatient({ name: "doctors" })}>
                {t("home.findDoctor")}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => pushPatient({ name: "appointment", id: a.id })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {a.doctor?.name ?? "Doctor"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {fmtDateTime(a.slotStart)}
                      {a.chamberName ? ` · ${a.chamberName}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <AppointmentStatusBadge status={a.status} />
                      {a.patientType ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t(`type.${a.patientType}`)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-foreground">
                      <Money amount={a.fee} currency={a.currency} />
                    </p>
                    <ChevronRight
                      className="ml-auto mt-1 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── Top rated doctors ───────────────────────────────────── */}
      <SectionCard
        title={t("home.topDoctors")}
        action={
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            onClick={() => resetPatient({ name: "doctors" })}
          >
            {t("common.viewAll")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }
      >
        {sectionsError && topDoctors === null ? (
          <p className="text-xs text-muted-foreground">
            {t("common.errorHint")}
          </p>
        ) : topDoctors === null ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-36 w-60 shrink-0 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : topDoctors.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto app-scroll pb-1">
            {topDoctors.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => pushPatient({ name: "doctor", slug: doc.slug })}
                className="w-60 shrink-0 rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
              >
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    name={doc.name}
                    photoUrl={doc.photoUrl}
                    className="h-11 w-11"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {doc.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.specialties[0]?.name ?? doc.city}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <Stars rating={doc.ratingAvg} count={doc.ratingCount} />
                  <span className="text-sm font-bold text-foreground">
                    <Money amount={doc.consultationFee} currency={doc.currency} />
                  </span>
                </div>
                {doc.nextAvailableLabel ? (
                  <Badge
                    variant="outline"
                    className="mt-2.5 border-transparent bg-primary-soft text-primary text-[10px]"
                  >
                    {t("search.nextAvailable", { when: doc.nextAvailableLabel })}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <DemoNotice />
    </div>
  );
}
