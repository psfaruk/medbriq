"use client";

/**
 * HospitalDetailScreen — hospital info plus the doctors practising there
 * (server-side q search on the hospital name, client-side exact filter).
 */

import { useMemo } from "react";
import { Building2, Info, MapPin, Phone, Stethoscope } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type { DoctorCard, HospitalInfo } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  SectionCard,
  useT,
} from "@/components/app/shared/ui-kit";
import { DoctorCardRow, useApiData } from "../parts";

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
        title="No listed doctors yet"
        hint="Doctors practising here have not published bookable profiles."
      />
    );
  }
  return (
    <div className="space-y-3">
      {hospitalDoctors.map((d) => (
        <DoctorCardRow key={d.id} doctor={d} />
      ))}
    </div>
  );
}

export default function HospitalDetailScreen({ slug }: { slug: string }) {
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
        <PageHeader title="Hospital" onBack={popPatient} />
        <ErrorState message={hospitals.error} onRetry={hospitals.reload} />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hospital" onBack={popPatient} />
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="Hospital not found"
          hint="It may no longer be listed on the platform."
          action={
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => pushPatient({ name: "hospitals" })}
            >
              Back to hospitals
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title={hospital.name} subtitle={hospital.city} onBack={popPatient} />

      {/* ── info card ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">{hospital.name}</h2>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
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
              {hospital.doctorCount} {hospital.doctorCount === 1 ? "doctor" : "doctors"}
            </p>
          </div>
        </div>
      </section>

      {/* ── about ───────────────────────────────────────────────── */}
      {hospital.about ? (
        <SectionCard title="About">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {hospital.about}
          </p>
        </SectionCard>
      ) : null}

      {/* ── doctors ─────────────────────────────────────────────── */}
      <SectionCard title={`Doctors at ${hospital.name}`}>
        <HospitalDoctors key={hospital.slug} hospitalName={hospital.name} />
      </SectionCard>
    </div>
  );
}
