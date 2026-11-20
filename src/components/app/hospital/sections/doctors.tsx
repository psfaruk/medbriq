"use client";

import { useEffect, useState } from "react";
import { Info, Mail, MapPin, Stethoscope } from "lucide-react";
import { apiGet, ApiCallError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  UserAvatar,
  VerificationBadge,
  useT,
} from "@/components/app/shared/ui-kit";
import type { HospitalDoctor } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

function SpecialtyChips({ specialties }: { specialties: string[] }) {
  if (specialties.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {specialties.map((s) => (
        <Badge
          key={s}
          variant="outline"
          className="border-primary/20 bg-primary-soft font-medium text-primary"
        >
          {s}
        </Badge>
      ))}
    </div>
  );
}

export default function DoctorsSection() {
  const { t } = useT();
  const [items, setItems] = useState<HospitalDoctor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ items: HospitalDoctor[] }>("/api/v2/hospital/doctors")
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiCallError ? err.message : ERROR_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hospitalNav.doctors")}
        subtitle="Doctors attached to your hospital across all branches."
      />

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground shadow-soft sm:p-5">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Doctors manage their own schedules and fees — the hospital directory
          lists doctors attached to this hospital.
        </p>
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
          Doctor onboarding: doctors register themselves and select this
          hospital in their profile.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : items === null ? (
        <LoadingCard rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No doctors attached yet"
          hint="When doctors select your hospital in their profile, they appear here automatically."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead className="text-right">Reviews</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={d.name} className="h-9 w-9" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {d.name}
                            </p>
                            <VerificationBadge status={d.verificationStatus} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SpecialtyChips specialties={d.specialties} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.email}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.city}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {d.experienceYears} yrs
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {d.appointmentCount}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {d.reviewCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((d) => (
              <article
                key={d.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar name={d.name} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {d.name}
                      </h3>
                      <VerificationBadge status={d.verificationStatus} />
                    </div>
                    <div className="mt-1">
                      <SpecialtyChips specialties={d.specialties} />
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        {d.email}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {d.city} · {d.experienceYears} yrs experience
                      </p>
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                      {d.appointmentCount} appointments · {d.reviewCount} reviews
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
