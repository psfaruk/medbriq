"use client";

import { useCallback } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Hourglass,
  Stethoscope,
  MapPin,
  Info,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/lib/api-client";
import type { AdminStats } from "@/lib/types";
import {
  PageHeader,
  StatCard,
  SectionCard,
  LoadingCard,
  ErrorState,
  Money,
  Stars,
  UserAvatar,
  useT,
} from "@/components/app/shared/ui-kit";
import type { PublicDoctorCard } from "../types";
import { useAdminData } from "../use-admin-data";

/**
 * Appointments — aggregate monitoring view.
 *
 * There is no admin per-appointment listing endpoint (per-appointment data
 * lives in each doctor's and hospital's own dashboard), so this section
 * honestly aggregates: platform counters from /api/v1/admin/stats plus the
 * public doctor activity table from /api/v1/doctors (rating-sorted), with a
 * reference into the payments ledger. No fabricated rows.
 */
export default function AppointmentsSection({
  onNavigate,
}: {
  onNavigate?: (section: string) => void;
}) {
  const { t } = useT();

  const loader = useCallback(async () => {
    const [stats, doctors] = await Promise.all([
      apiGet<AdminStats>("/api/v1/admin/stats"),
      apiGet<{ items: PublicDoctorCard[]; total: number }>(
        "/api/v1/doctors?pageSize=24&sort=rating"
      ),
    ]);
    return { stats, doctors: doctors.items, total: doctors.total };
  }, []);
  const { data, error, loading, reload } = useAdminData(loader);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appointment monitoring — aggregate view"
        subtitle="Platform-wide appointment counters and booking activity per doctor."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Total appointments"
              value={data.stats.totalAppointments}
              hint="All time, every doctor"
              icon={<CalendarCheck className="h-4 w-4" />}
              tone="primary"
            />
            <StatCard
              label="Confirmed"
              value={data.stats.confirmedAppointments}
              hint="Accepted by the doctor"
              icon={<CalendarClock className="h-4 w-4" />}
              tone="success"
            />
            <StatCard
              label="Pending approvals"
              value={data.stats.pendingApprovals}
              hint="Waiting on a doctor decision"
              icon={<Hourglass className="h-4 w-4" />}
              tone="warning"
            />
          </div>

          <div
            className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
            role="note"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Per-appointment drill-down (patient details, consultation notes,
              per-visit status changes) lives in the{" "}
              <strong className="text-foreground">doctor</strong> and{" "}
              <strong className="text-foreground">hospital</strong> dashboards —
              role-separated for patient privacy. This view stays aggregate on
              purpose.
            </p>
          </div>

          {/* ── Payments ledger reference ─────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
            <span className="flex items-start gap-3">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Booking payments tied to these appointments are tracked in the{" "}
                <strong className="text-foreground">payments ledger</strong>{" "}
                (sandbox) — reference codes, methods, amounts and refunds.
              </p>
            </span>
            {onNavigate ? (
              <button
                onClick={() => onNavigate("payments")}
                className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
              >
                Open payments ledger
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <SectionCard
            title={`Booking activity by doctor (${data.doctors.length} of ${data.total} listed)`}
            contentClassName="p-0"
          >
            {data.doctors.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No doctors are publicly listed yet.
              </p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-card hover:bg-card">
                        <TableHead>Doctor</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Consultation fee</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Next available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.doctors.map((d) => (
                        <TableRow key={d.id} className="text-sm">
                          <TableCell>
                            <span className="flex items-center gap-2.5">
                              <UserAvatar name={d.name} photoUrl={d.photoUrl} className="h-8 w-8" />
                              <span className="font-medium text-foreground">
                                {d.name}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.specialties.length > 0
                              ? d.specialties.map((s) => s.name).join(", ")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.city}
                          </TableCell>
                          <TableCell>
                            <Money amount={d.consultationFee} className="font-medium" />
                          </TableCell>
                          <TableCell>
                            <Stars rating={d.ratingAvg} count={d.ratingCount} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {d.nextAvailableLabel ?? t("common.notAvailable")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card list */}
                <ul className="divide-y divide-border/70 md:hidden">
                  {data.doctors.map((d) => (
                    <li key={d.id} className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                          <UserAvatar name={d.name} photoUrl={d.photoUrl} className="h-9 w-9 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {d.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {d.city}
                            </span>
                          </span>
                        </span>
                        <Stars rating={d.ratingAvg} count={d.ratingCount} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {d.specialties.length > 0
                            ? d.specialties.map((s) => s.name).join(", ")
                            : "—"}
                        </span>
                        <Money amount={d.consultationFee} className="font-medium text-foreground" />
                        {d.nextAvailableLabel ? (
                          <span>Next: {d.nextAvailableLabel}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SectionCard>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            Doctor table is sorted by rating (then experience) and shows public
            directory data — the same list patients see when booking.
          </p>
        </>
      )}
    </div>
  );
}
