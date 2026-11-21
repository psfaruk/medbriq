"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import { getPreloadedBoot } from "@/lib/boot-data";
import { searchPreset, setSearchPreset } from "../preset";
import type { AppointmentDto, DoctorCard, SpecialtyInfo } from "@/lib/types";
import {
  SectionCard,
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  Stars,
  UserAvatar,
  VerificationBadge,
  useT,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  CalendarCheck,
  FolderHeart,
  LayoutGrid,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

/** Home dashboard (master prompt §3.9). */
export default function HomeScreen() {
  const { t } = useT();
  const { user, pushPatient, resetPatient } = useAppStore();
  const [specialties, setSpecialties] = useState<SpecialtyInfo[] | null>(null);
  const [doctors, setDoctors] = useState<DoctorCard[] | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDto[] | null>(
    null
  );
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  const reload = () => {
    setFailed(false);
    apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
      .then((d) => setSpecialties(d.items))
      .catch(() => setFailed(true));
    apiGet<{ items: DoctorCard[] }>(
      "/api/v1/doctors?sort=rating&pageSize=6&verified=true"
    )
      .then((d) => setDoctors(d.items))
      .catch(() => setFailed(true));
    apiGet<{ items: AppointmentDto[] }>("/api/v1/appointments")
      .then((d) => setAppointments(d.items))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    // PERF: the single bootstrap request (app.tsx) already delivered this
    // exact data — render it instantly and skip the three-fetch waterfall.
    // User-scoped appointments are only trusted when the payload was
    // captured for THIS session's user (a guest→login transition must not
    // reuse the guest's empty list). Falls back to reload() otherwise.
    const pre = getPreloadedBoot();
    if (
      pre &&
      pre.specialties &&
      pre.homeDoctors &&
      pre.capturedForUserId === (user?.id ?? null) &&
      pre.appointments
    ) {
      setSpecialties(pre.specialties);
      setDoctors(pre.homeDoctors);
      setAppointments(pre.appointments);
      return;
    }
    reload();
  }, []);

  const upcoming = (appointments ?? [])
    .filter(
      (a) =>
        (a.status === "PENDING_APPROVAL" || a.status === "CONFIRMED") &&
        new Date(a.slotEnd).getTime() > Date.now()
    )
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
    .slice(0, 2);

  if (failed) return <ErrorState onRetry={reload} />;

  return (
    <div className="space-y-5">
      {/* Hero band */}
      <div className="bg-brand-gradient relative overflow-hidden rounded-2xl p-5 text-white sm:p-7">
        <div
          className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/10"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold text-white/80">
          {t("home.greeting", { name: user?.name.split(" ")[0] ?? "" })}
        </p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          {t("home.howCanWeHelp")}
        </h1>
        <div className="relative mt-4 flex max-w-md items-center gap-2 rounded-xl bg-white p-1.5 shadow-lg">
          <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                setSearchPreset({ q: query.trim() });
                resetPatient({ name: "doctors" });
              }
            }}
            placeholder={t("home.searchPlaceholder")}
            className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label={t("home.searchPlaceholder")}
          />
          <Button
            size="sm"
            className="h-9 shrink-0"
            onClick={() => {
              if (query.trim()) {
                setSearchPreset({ q: query.trim() });
              }
              resetPatient({ name: "doctors" });
            }}
          >
            {t("common.search")}
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {
            icon: Search,
            label: t("home.findDoctor"),
            onClick: () => resetPatient({ name: "doctors" }),
          },
          {
            icon: CalendarCheck,
            label: t("home.myBookings"),
            onClick: () => resetPatient({ name: "bookings" }),
          },
          {
            icon: FolderHeart,
            label: t("home.familyRecords"),
            onClick: () => resetPatient({ name: "records" }),
          },
          {
            icon: LayoutGrid,
            label: t("home.specialties"),
            onClick: () => pushPatient({ name: "specialties" }),
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="card-lift flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center shadow-soft"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-foreground">
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* Specialties row */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {t("home.specialties")}
          </h2>
          <button
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => pushPatient({ name: "specialties" })}
          >
            {t("common.viewAll")}
          </button>
        </div>
        {specialties === null ? (
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-28 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="app-scroll flex gap-2 overflow-x-auto pb-1">
            {specialties.slice(0, 10).map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSearchPreset({ specialty: s.slug });
                  resetPatient({ name: "doctors" });
                }}
                className="card-lift flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-soft"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <span className="text-left">
                  <span className="block text-xs font-semibold text-foreground">
                    {s.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {s.doctorCount} doctors
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming appointments */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {t("home.upcoming")}
          </h2>
          <button
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => resetPatient({ name: "bookings" })}
          >
            {t("common.viewAll")}
          </button>
        </div>
        {appointments === null ? (
          <LoadingCard rows={1} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title={t("home.noUpcoming")}
            hint={t("appointments.emptyHint")}
            action={
              <Button size="sm" onClick={() => resetPatient({ name: "doctors" })}>
                {t("home.bookNow")}
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => (
              <button
                key={a.id}
                onClick={() => pushPatient({ name: "appointment", id: a.id })}
                className="card-lift flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <CalendarCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {a.doctor?.name ?? "Appointment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(a.slotStart)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Money
                    amount={a.fee}
                    className="text-sm font-bold text-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t(`status.${a.status}`)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Top doctors */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {t("home.topDoctors")}
          </h2>
          <button
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => resetPatient({ name: "doctors" })}
          >
            {t("common.viewAll")}
          </button>
        </div>
        {doctors === null ? (
          <LoadingCard rows={2} />
        ) : doctors.length === 0 ? (
          <EmptyState title={t("search.noResults")} />
        ) : (
          <div className="app-scroll flex gap-3 overflow-x-auto pb-1">
            {doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => pushPatient({ name: "doctor", slug: d.slug })}
                className="card-lift w-56 shrink-0 rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <UserAvatar name={d.name} photoUrl={d.photoUrl} />
                  {d.verificationStatus === "VERIFIED" ? (
                    <VerificationBadge status={d.verificationStatus} />
                  ) : null}
                </div>
                <p className="mt-2.5 truncate text-sm font-semibold text-foreground">
                  {d.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.specialties[0]?.name ?? "General"}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <Stars rating={d.ratingAvg} count={d.ratingCount} />
                  <Money
                    amount={d.consultationFee}
                    currency={d.currency}
                    className="text-xs font-bold text-primary"
                  />
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
                  Next: {d.nextAvailableLabel ?? t("common.notAvailable")}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <SectionCard>
        <p className="text-xs leading-relaxed text-muted-foreground">
          All doctors, hospitals and payments in this demo are fictional
          sandbox data — no real medical service. For emergencies call{" "}
          <strong className="text-destructive">999</strong>.
        </p>
      </SectionCard>
    </div>
  );
}
