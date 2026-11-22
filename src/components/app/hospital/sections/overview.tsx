"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Layers,
  Stethoscope,
} from "lucide-react";
import { apiGet, ApiCallError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AppointmentStatusBadge,
  DemoNotice,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PaymentStatusBadge,
  SectionCard,
  StatCard,
  VerificationBadge,
  fmtDate,
  fmtTime,
  useT,
} from "@/components/app/shared/ui-kit";
import type { HospitalOverview, HospitalProfile } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

/** Quick-link tile (overview shortcuts to other sections). */
function QuickLink({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-soft transition-all hover:border-primary/40 hover:text-primary"
    >
      <span className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

export default function OverviewSection({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const { t } = useT();
  const [overview, setOverview] = useState<HospitalOverview | null>(null);
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<HospitalOverview>("/api/v2/hospital/overview"),
      apiGet<{ profile: HospitalProfile }>("/api/v2/hospital/profile"),
    ])
      .then(([ov, pf]) => {
        if (cancelled) return;
        setOverview(ov);
        setProfile(pf.profile);
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

  if (error) {
    return <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />;
  }
  if (!overview) {
    return <LoadingCard rows={6} />;
  }

  const { hospital, stats } = overview;
  const verification = profile?.verificationStatus ?? hospital.verificationStatus;

  return (
    <div className="space-y-5">
      <PageHeader
        title={hospital.name}
        subtitle={`${hospital.city} · /hospitals/${hospital.slug}`}
        action={<VerificationBadge status={verification} />}
      />

      {verification !== "VERIFIED" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <p className="font-medium">
            {`Verification ${verification.replaceAll("_", " ").toLowerCase()} — your public profile activates after admin review.`}
          </p>
          {profile?.verificationNote ? (
            <p className="mt-1 text-xs opacity-90">Note: {profile.verificationNote}</p>
          ) : null}
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Doctors"
          value={stats.doctorCount}
          hint={`${stats.verifiedDoctors} verified · ${stats.pendingDoctors} pending`}
          icon={<Stethoscope className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Today's appointments"
          value={stats.todaysAppointments}
          hint="Scheduled for today (Dhaka)"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Total appointments"
          value={stats.totalAppointments}
          hint="Across all attached doctors"
          icon={<CalendarCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Pending approvals"
          value={stats.pendingApprovals}
          hint="Waiting for doctor confirmation"
          icon={<Clock3 className="h-4 w-4" />}
          tone={stats.pendingApprovals > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Completed visits"
          value={stats.completedAppointments}
          hint="Life-to-date completed consultations"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Branches"
          value={stats.branchCount}
          hint="Practice locations"
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Departments"
          value={stats.departmentCount}
          hint="Clinical service lines"
          icon={<Layers className="h-4 w-4" />}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          label="Review appointments"
          icon={<CalendarDays className="h-4 w-4" />}
          onClick={() => onNavigate("appointments")}
        />
        <QuickLink
          label="Manage branches"
          icon={<Building2 className="h-4 w-4" />}
          onClick={() => onNavigate("branches")}
        />
        <QuickLink
          label="Manage departments"
          icon={<Layers className="h-4 w-4" />}
          onClick={() => onNavigate("departments")}
        />
        <QuickLink
          label="View revenue"
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => onNavigate("revenue")}
        />
      </div>

      {/* Recent appointments */}
      <SectionCard
        title="Recent appointments"
        action={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary"
            onClick={() => onNavigate("appointments")}
          >
            {t("common.viewAll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        }
        contentClassName="p-0 sm:p-0"
      >
        {overview.recentAppointments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            No appointments yet — they appear here once patients book your doctors.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[780px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Chamber</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentAppointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {fmtDate(a.slotStart)}
                        </span>{" "}
                        · {fmtTime(a.slotStart)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {a.patientName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.referenceCode}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{a.doctorName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.chamberName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <AppointmentStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={a.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        <Money amount={a.fee} currency={a.currency} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border/70 md:hidden">
              {overview.recentAppointments.map((a) => (
                <li key={a.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {a.patientName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.referenceCode} · {fmtDate(a.slotStart)} ·{" "}
                        {fmtTime(a.slotStart)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      <Money amount={a.fee} currency={a.currency} />
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {a.doctorName}
                    {a.chamberName ? ` · ${a.chamberName}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <AppointmentStatusBadge status={a.status} />
                    <PaymentStatusBadge status={a.paymentStatus} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      <DemoNotice />
    </div>
  );
}
