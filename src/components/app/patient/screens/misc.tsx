"use client";

/**
 * misc.tsx — smaller patient screens (new style):
 *   NotificationsScreen — full notification center
 *   SpecialtiesScreen   — specialty directory (→ pre-filtered doctor search)
 *   HospitalsScreen     — public hospital directory
 *   HospitalDetailScreen— hospital info + practising doctors
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Baby,
  Bell,
  Bone,
  Brain,
  Building2,
  CheckCheck,
  ChevronRight,
  Eye,
  HeartPulse,
  Info,
  MapPin,
  Phone,
  PhoneCall,
  Stethoscope,
  Syringe,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/app-state";
import { apiGet, apiPost } from "@/lib/api-client";
import type {
  DoctorCard,
  HospitalInfo,
  NotificationItem,
  SpecialtyInfo,
} from "@/lib/types";
import {
  DemoNotice,
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  SectionCard,
  Stars,
  UserAvatar,
  VerificationBadge,
  useT,
} from "@/components/app/shared/ui-kit";
import { searchPreset, setSearchPreset } from "../preset";
import { useApiData } from "./shared";

// ════════════════════════════════════════════════════════════════════
// Notifications
// ════════════════════════════════════════════════════════════════════

function metaAppointmentId(meta: string | null): string | null {
  if (!meta) return null;
  try {
    const parsed = JSON.parse(meta) as { appointmentId?: string };
    return typeof parsed.appointmentId === "string" ? parsed.appointmentId : null;
  } catch {
    return null;
  }
}

export function NotificationsScreen() {
  const { t } = useT();
  const pushPatient = useAppStore((s) => s.pushPatient);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, reload } = useApiData<{
    items: NotificationItem[];
    unreadCount: number;
  }>(
    () =>
      apiGet<{ items: NotificationItem[]; unreadCount: number }>(
        "/api/v1/notifications"
      ),
    []
  );

  const openItem = async (n: NotificationItem) => {
    if (!n.readAt) {
      setBusyId(n.id);
      try {
        await apiPost(`/api/v1/notifications/${n.id}/read`);
      } catch {
        /* non-blocking */
      }
      setBusyId(null);
      reload();
    }
    const appointmentId = metaAppointmentId(n.meta);
    if (appointmentId) {
      pushPatient({ name: "appointment", id: appointmentId });
    }
  };

  const markAll = async () => {
    setBusyId("__all__");
    try {
      await apiPost("/api/v1/notifications/read-all");
      reload();
    } catch {
      /* non-blocking */
    }
    setBusyId(null);
  };

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("notifications.title")}
        subtitle={
          data
            ? unread > 0
              ? t("notifications.unreadCount", { count: unread })
              : t("notifications.allCaughtUp")
            : undefined
        }
        action={
          unread > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={markAll}
              disabled={busyId === "__all__"}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("notifications.markAllRead")}
            </Button>
          ) : undefined
        }
      />

      {loading && !data ? (
        <LoadingCard rows={4} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={t("notifications.empty")}
          hint={t("notifications.emptyHint")}
        />
      ) : (
        <ul className="app-scroll max-h-[36rem] space-y-2 overflow-y-auto pr-1">
          {items.map((n) => {
            const unreadItem = !n.readAt;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  disabled={busyId === n.id}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors",
                    unreadItem
                      ? "border-primary/30 bg-primary-soft/40"
                      : "border-border bg-card",
                    "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        unreadItem
                          ? "font-bold text-foreground"
                          : "font-medium text-foreground/80"
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {unreadItem ? (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-primary text-[10px] text-primary-foreground"
                        >
                          {t("notifications.new")}
                        </Badge>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Dhaka",
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {n.body}
                  </span>
                  {metaAppointmentId(n.meta) ? (
                    <span className="mt-1 text-[11px] font-medium text-primary">
                      {t("common.viewAppointment")} →
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Specialties
// ════════════════════════════════════════════════════════════════════

/** Best-effort icon mapping; anything unknown falls back to Activity. */
const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  heart: HeartPulse,
  cardiology: HeartPulse,
  "internal-medicine": Stethoscope,
  medicine: Stethoscope,
  diabetology: Activity,
  pediatrics: Baby,
  child: Baby,
  gynecology: Baby,
  orthopedics: Bone,
  bone: Bone,
  neurology: Brain,
  brain: Brain,
  ophthalmology: Eye,
  eye: Eye,
  dentistry: Syringe,
  dental: Syringe,
  ent: UserRound,
  surgery: Syringe,
  dermatology: Activity,
  psychiatry: Brain,
};

function specialtyIcon(slug: string): LucideIcon {
  const key = slug.toLowerCase();
  for (const [needle, icon] of Object.entries(SPECIALTY_ICONS)) {
    if (key.includes(needle)) return icon;
  }
  return Activity;
}

const ICON_TONES = [
  "bg-primary-soft text-primary",
  "bg-teal-50 text-teal-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-500",
  "bg-emerald-50 text-emerald-600",
  "bg-violet-50 text-violet-600",
];

export function SpecialtiesScreen() {
  const { t, lang } = useT();
  const resetPatient = useAppStore((s) => s.resetPatient);
  const { data, loading, error, reload } = useApiData<{
    items: SpecialtyInfo[];
  }>(() => apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties"), []);

  const openSpecialty = (slug: string) => {
    setSearchPreset({ specialty: slug });
    resetPatient({ name: "doctors" });
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("home.specialties")}
        subtitle={t("specialties.subtitle")}
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title={t("common.empty")} hint={t("common.errorHint")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((s, i) => {
            const Icon = specialtyIcon(s.slug);
            const tone = ICON_TONES[i % ICON_TONES.length];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => openSpecialty(s.slug)}
                className="card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center shadow-soft"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {lang === "bn" && s.nameBn ? s.nameBn : s.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("specialties.doctorCount", {
                    count: s.doctorCount,
                  })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Hospitals
// ════════════════════════════════════════════════════════════════════

export function HospitalsScreen() {
  const { t } = useT();
  const pushPatient = useAppStore((s) => s.pushPatient);
  const { data, loading, error, reload } = useApiData<{
    items: HospitalInfo[];
  }>(() => apiGet<{ items: HospitalInfo[] }>("/api/v1/hospitals"), []);

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("hospitals.title")}
        subtitle={t("hospitals.subtitle")}
      />

      {loading && !data ? (
        <div className="space-y-3">
          <LoadingCard rows={2} />
          <LoadingCard rows={2} />
        </div>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("common.empty")}
          hint={t("common.errorHint")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => pushPatient({ name: "hospital", slug: h.slug })}
              className="card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <ChevronRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {h.name}
              </h3>
              <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin
                  className="mt-0.5 h-3 w-3 shrink-0"
                  aria-hidden="true"
                />
                {[h.address, h.city].filter(Boolean).join(", ")}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Stethoscope className="h-3 w-3" aria-hidden="true" />
                {t("specialties.doctorCount", { count: h.doctorCount })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Hospital detail
// ════════════════════════════════════════════════════════════════════

/** Doctor row styled like the doctors search results (doctors.tsx). */
function DoctorRow({ doctor }: { doctor: DoctorCard }) {
  const { t } = useT();
  const pushPatient = useAppStore((s) => s.pushPatient);
  return (
    <article className="card-lift rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => pushPatient({ name: "doctor", slug: doctor.slug })}
          aria-label={doctor.name}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar
            name={doctor.name}
            photoUrl={doctor.photoUrl}
            className="h-14 w-14"
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="truncate text-sm font-bold text-foreground hover:text-primary"
              onClick={() => pushPatient({ name: "doctor", slug: doctor.slug })}
            >
              {doctor.name}
            </button>
            {doctor.verificationStatus === "VERIFIED" ? (
              <VerificationBadge status="VERIFIED" />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {doctor.specialties.map((s) => s.name).join(" · ")}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Stars rating={doctor.ratingAvg} count={doctor.ratingCount} />
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {doctor.city}
            </span>
            <span>
              {t("search.yearsExperience", { years: doctor.experienceYears })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
          <div className="text-right">
            <Money
              amount={doctor.consultationFee}
              currency={doctor.currency}
              className="text-base font-bold text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("doctor.newPatient")}
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => pushPatient({ name: "doctor", slug: doctor.slug })}
          >
            {t("search.viewProfile")}
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Doctors list — mounted (keyed) only once the hospital is resolved. */
function HospitalDoctors({ hospitalName }: { hospitalName: string }) {
  const { t } = useT();
  const doctors = useApiData<{ items: DoctorCard[] }>(
    () =>
      apiGet<{ items: DoctorCard[] }>(
        `/api/v1/doctors?q=${encodeURIComponent(hospitalName)}&pageSize=24`
      ),
    [hospitalName]
  );
  const hospitalDoctors = useMemo(
    () =>
      (doctors.data?.items ?? []).filter(
        (d) => d.hospitalName?.toLowerCase() === hospitalName.toLowerCase()
      ),
    [doctors.data, hospitalName]
  );

  if (doctors.loading && !doctors.data) {
    return <LoadingCard rows={3} />;
  }
  if (doctors.error && !doctors.data) {
    return <ErrorState message={doctors.error} onRetry={doctors.reload} />;
  }
  if (hospitalDoctors.length === 0) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" />}
        title={t("hospitals.noDoctors")}
        hint={t("hospitals.noDoctorsHint")}
      />
    );
  }
  return (
    <div className="space-y-3">
      {hospitalDoctors.map((d) => (
        <DoctorRow key={d.id} doctor={d} />
      ))}
    </div>
  );
}

export function HospitalDetailScreen({ slug }: { slug: string }) {
  const { t } = useT();
  const popPatient = useAppStore((s) => s.popPatient);
  const pushPatient = useAppStore((s) => s.pushPatient);

  const hospitals = useApiData<{ items: HospitalInfo[] }>(
    () => apiGet<{ items: HospitalInfo[] }>("/api/v1/hospitals"),
    [slug]
  );

  const hospital = useMemo(
    () => hospitals.data?.items.find((h) => h.slug === slug) ?? null,
    [hospitals.data, slug]
  );

  if (hospitals.loading && !hospitals.data) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={4} />
        <LoadingCard rows={2} />
      </div>
    );
  }

  if (hospitals.error && !hospitals.data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("hospitals.title")} onBack={popPatient} />
        <ErrorState message={hospitals.error} onRetry={hospitals.reload} />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("hospitals.title")} onBack={popPatient} />
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("hospitals.notFound")}
          hint={t("hospitals.notFoundHint")}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => pushPatient({ name: "hospitals" })}
            >
              {t("hospitals.backToHospitals")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={hospital.name}
        subtitle={hospital.city}
        onBack={popPatient}
      />

      {/* ── info card ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">
              {hospital.name}
            </h2>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin
                className="mt-0.5 h-3 w-3 shrink-0"
                aria-hidden="true"
              />
              {[hospital.address, hospital.city].filter(Boolean).join(", ")}
            </p>
            {hospital.phone ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {hospital.phone}
              </p>
            ) : null}
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Stethoscope className="h-3 w-3" aria-hidden="true" />
              {t("specialties.doctorCount", { count: hospital.doctorCount })}
            </p>
          </div>
        </div>
      </section>

      {/* ── about ───────────────────────────────────────────────── */}
      {hospital.about ? (
        <SectionCard title={t("hospitals.about")}>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {hospital.about}
          </p>
        </SectionCard>
      ) : null}

      {/* ── doctors ─────────────────────────────────────────────── */}
      <SectionCard
        title={t("hospitals.doctorsAt", { name: hospital.name })}
      >
        <HospitalDoctors key={hospital.slug} hospitalName={hospital.name} />
      </SectionCard>

      {/* ── sandbox disclaimer + emergency guidance ─────────────── */}
      <SectionCard>
        <DemoNotice />
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <PhoneCall className="h-3 w-3" aria-hidden="true" />
          {t("common.emergencyCall")}
        </p>
      </SectionCard>
    </div>
  );
}
