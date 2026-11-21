"use client";

/**
 * Public hospital profile (spec §5): verified info, contact/location,
 * doctors practising here. Hospital branches/departments live in the
 * hospital dashboard (v2 APIs, login-gated); this public page links the
 * public doctor directory associated with the hospital.
 */

import { MapPin, Phone, Building2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DoctorCard, HospitalInfo } from "@/lib/types";
import { useT, EmptyState, ErrorState, VerificationBadge } from "@/components/app/shared/ui-kit";
import {
  Breadcrumbs,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";
import { DoctorCard as DoctorCardComponent } from "../doctors/doctor-card";

export default function HospitalProfileView({ slug }: { slug: string }) {
  const { t } = useT();
  useTrackPageView("hospital");

  const hospitals = usePortalData<{ items: HospitalInfo[] }>("/api/v1/hospitals");
  const doctors = usePortalData<{ items: DoctorCard[]; total: number }>(
    "/api/v1/doctors?pageSize=24"
  );

  const hospital = hospitals.data?.items.find((h) => h.slug === slug) ?? null;
  const hospitalDoctors = (doctors.data?.items ?? []).filter(
    (d) => d.hospitalName === hospital?.name
  );

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.nav.hospitals"), view: { name: "hospitals" } },
          { label: hospital?.name ?? "…" },
        ]}
      />

      {hospitals.loading && !hospitals.data && (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      )}
      {hospitals.error && !hospitals.data && (
        <ErrorState message={hospitals.error} onRetry={hospitals.reload} />
      )}
      {!hospitals.loading && !hospital && (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={t("portal.hospital.notFound")}
          hint="The hospital may have been removed or the link is incorrect."
          action={
            <PortalLink view={{ name: "hospitals" }}>
              <Button size="sm" variant="outline">
                {t("portal.cta.viewAllHospitals")}
              </Button>
            </PortalLink>
          }
        />
      )}

      {hospital && (
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#13A89E]/10 text-[#0f8f87]">
                  <Building2 className="h-8 w-8" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                      {hospital.name}
                    </h1>
                    {/* Hospital records carry verificationStatus internally; the
                        public list shape does not expose it yet — show an honest
                        "Listed" state rather than inventing a verified badge. */}
                    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      Listed
                    </span>
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {[hospital.address, hospital.city].filter(Boolean).join(", ")}
                  </p>
                  {hospital.phone && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {hospital.phone}
                    </p>
                  )}
                </div>
              </div>
              {hospital.about && (
                <div className="mt-4 border-t border-border pt-4">
                  <h2 className="text-sm font-bold text-foreground">
                    {t("portal.hospital.about")}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {hospital.about}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <section aria-labelledby="hospital-doctors">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="hospital-doctors" className="text-lg font-bold text-foreground">
                {t("portal.hospital.doctors")}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  ({hospitalDoctors.length})
                </span>
              </h2>
              <PortalLink
                view={{ name: "doctors" }}
                className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary hover:underline"
              >
                {t("portal.cta.viewAllDoctors")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PortalLink>
            </div>
            {doctors.loading && !doctors.data && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-52 rounded-2xl" />
                ))}
              </div>
            )}
            {doctors.data && hospitalDoctors.length === 0 && (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  No doctor profiles are currently associated with this hospital in
                  the public directory.
                </CardContent>
              </Card>
            )}
            {hospitalDoctors.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {hospitalDoctors.map((d) => (
                  <DoctorCardComponent key={d.slug} doctor={d} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
