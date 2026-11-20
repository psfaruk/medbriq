"use client";

/**
 * HospitalsScreen — public hospital directory cards.
 */

import { Building2, ChevronRight, MapPin, Stethoscope } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type { HospitalInfo } from "@/lib/types";
import {
  ErrorState,
  LoadingCard,
  PageHeader,
  useT,
} from "@/components/app/shared/ui-kit";
import { useApiData } from "../parts";

export default function HospitalsScreen() {
  const { t } = useT();
  const pushPatient = useAppStore((s) => s.pushPatient);
  const { data, loading, error, reload } = useApiData<{ items: HospitalInfo[] }>(
    () => apiGet<{ items: HospitalInfo[] }>("/api/v1/hospitals"),
    []
  );

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hospitals"
        subtitle="Hospitals and clinics with doctors on MedBricBD"
      />

      {loading && !data ? (
        <div className="space-y-3">
          <LoadingCard rows={2} />
          <LoadingCard rows={2} />
        </div>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <LoadingCard rows={1} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => pushPatient({ name: "hospital", slug: h.slug })}
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-soft card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <h3 className="mt-3 text-sm font-semibold text-foreground">{h.name}</h3>
              <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {[h.address, h.city].filter(Boolean).join(", ")}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Stethoscope className="h-3 w-3" aria-hidden="true" />
                {h.doctorCount} {h.doctorCount === 1 ? "doctor" : "doctors"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
