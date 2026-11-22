"use client";

/**
 * Overview — greeting, verification banner, stat cards, today's queue
 * preview, recent pending approval requests (with actions), earnings summary.
 */

import { useEffect, useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Hourglass,
  Star,
  Wallet,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AppointmentStatusBadge,
  DemoNotice,
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PatientTypeBadge,
  PaymentStatusBadge,
  SectionCard,
  StatCard,
  dhakaToday,
  fmtDate,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/lib/app-state";
import type { AppointmentDto } from "@/lib/types";
import { useDoctorDashboard } from "../context";
import { bySlotAsc, errMessage, fmtMoney } from "../helpers";
import { AppointmentActionButtons, useApptActions } from "./appointment-parts";

const VERIFICATION_HINTS: Record<string, string> = {
  PENDING: "Your credentials are queued for review. You can keep using the dashboard meanwhile.",
  UNDER_REVIEW: "An admin is reviewing your BMDC credentials now.",
  MORE_INFO: "An admin requested more information about your credentials — check your email.",
  REJECTED: "Your verification was rejected. Update your BMDC registration number and resubmit from My Profile.",
};

export default function OverviewSection() {
  const { user, setDoctorSection } = useAppStore();
  const { data, loading, error, reload } = useDoctorDashboard();

  const [today, setToday] = useState<AppointmentDto[] | null>(null);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayTick, setTodayTick] = useState(0);

  const refreshAll = () => {
    reload();
    setTodayLoading(true);
    setTodayTick((t) => t + 1);
  };

  useEffect(() => {
    let alive = true;
    apiGet<{ items: AppointmentDto[] }>(
      `/api/v1/doctor/appointments?date=${dhakaToday()}&limit=100`
    )
      .then((d) => {
        if (!alive) return;
        setToday([...d.items].sort(bySlotAsc));
        setTodayError(null);
        setTodayLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setTodayError(errMessage(err));
        setTodayLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [todayTick]);

  const { run, dialogs } = useApptActions(refreshAll);

  const firstName = (user?.name ?? "Doctor").split(" ").slice(0, 2).join(" ");
  const stats = data?.stats;
  const pending = data?.pending ?? [];
  const upcoming = data?.upcoming ?? [];
  const unverified =
    user?.verificationStatus && user.verificationStatus !== "VERIFIED";

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={4} />
        <LoadingCard rows={3} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState message={error} onRetry={reload} />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle="Here is how your practice looks today."
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setDoctorSection("queue")}
          >
            Today&apos;s queue
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {unverified ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Verification status: {user?.verificationStatus?.replaceAll("_", " ")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {VERIFICATION_HINTS[user?.verificationStatus ?? ""] ??
                "Complete verification to appear in patient search results."}
            </p>
          </div>
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Today's appointments"
          value={stats?.todayTotal ?? 0}
          hint="Across all statuses"
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Pending approvals"
          value={stats?.pendingRequests ?? 0}
          hint="Requests waiting for you"
          icon={<Hourglass className="h-4 w-4" />}
          tone={stats && stats.pendingRequests > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Confirmed upcoming"
          value={stats?.confirmedUpcoming ?? 0}
          hint="Future confirmed visits"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Completed total"
          value={stats?.completedTotal ?? 0}
          hint="All-time completed visits"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Rating"
          value={stats?.ratingAvg != null ? stats.ratingAvg.toFixed(1) : "—"}
          hint={`${stats?.ratingCount ?? 0} patient reviews`}
          icon={<Star className="h-4 w-4" />}
        />
        <StatCard
          label="Net earnings"
          value={
            stats ? fmtMoney(stats.earnings.netEarnings, stats.earnings.currency) : "—"
          }
          hint="After 10% platform commission"
          icon={<Wallet className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: today's queue preview */}
        <SectionCard
          className="lg:col-span-2"
          title="Today's queue"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => setDoctorSection("queue")}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        >
          {todayLoading && !today ? (
            <div className="space-y-2">
              <div className="h-14 animate-pulse rounded-xl bg-muted" />
              <div className="h-14 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : todayError ? (
            <ErrorState message={todayError} onRetry={refreshAll} />
          ) : !today || today.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck2 className="h-6 w-6" />}
              title="No appointments today"
              hint="New bookings for today will appear here automatically."
            />
          ) : (
            <ul className="space-y-2">
              {today.slice(0, 4).map((appt) => (
                <li
                  key={appt.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <span className="flex h-9 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <span className="text-xs font-bold leading-none">
                      {fmtTime(appt.slotStart)}
                    </span>
                    <span className="mt-0.5 text-[9px] font-medium uppercase leading-none">
                      30 min
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {appt.patientName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {appt.patientAge != null ? `${appt.patientAge} yrs · ` : ""}
                      {appt.referenceCode}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PatientTypeBadge type={appt.patientType} />
                    <AppointmentStatusBadge status={appt.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Right: earnings summary */}
        <SectionCard title="Earnings summary">
          {stats ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-primary-soft px-4 py-3">
                <p className="text-xs font-medium text-primary">Net earnings</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  <Money amount={stats.earnings.netEarnings} currency={stats.earnings.currency} />
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  From {stats.completedTotal} completed consultations
                </p>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Gross revenue</dt>
                  <dd className="font-semibold tabular-nums">
                    <Money amount={stats.earnings.completedRevenue} currency={stats.earnings.currency} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Platform commission (10%)
                  </dt>
                  <dd className="font-semibold tabular-nums text-muted-foreground">
                    −{" "}
                    <Money amount={stats.earnings.platformCommission} currency={stats.earnings.currency} />
                  </dd>
                </div>
              </dl>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setDoctorSection("earnings")}
              >
                Earnings details <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          )}
        </SectionCard>
      </div>

      {/* Pending approval requests */}
      <SectionCard
        title={`Pending approval requests (${pending.length})`}
        action={
          pending.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-primary"
              onClick={() => setDoctorSection("appointments")}
            >
              All appointments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title="No pending requests"
            hint="New booking requests that need your approval will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 3).map((appt) => (
              <li
                key={appt.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border/70 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {appt.patientName}
                    </p>
                    <PatientTypeBadge type={appt.patientType} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmtDate(appt.slotStart)} · {fmtTime(appt.slotStart)} ·{" "}
                    {appt.referenceCode} · <Money amount={appt.fee} currency={appt.currency} />
                  </p>
                </div>
                <PaymentStatusBadge status={appt.paymentStatus} />
                <AppointmentActionButtons appt={appt} onAction={run} />
              </li>
            ))}
            {pending.length > 3 ? (
              <li className="pt-1 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => setDoctorSection("appointments")}
                >
                  + {pending.length - 3} more pending
                </Button>
              </li>
            ) : null}
          </ul>
        )}
      </SectionCard>

      {/* Upcoming confirmed */}
      {upcoming.length > 0 ? (
        <SectionCard title="Next confirmed visits">
          <ul className="divide-y divide-border/60">
            {upcoming.slice(0, 4).map((appt) => (
              <li
                key={appt.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Clock3 className="h-3.5 w-3.5" />
                  {fmtDate(appt.slotStart)} · {fmtTime(appt.slotStart)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {appt.patientName}
                </span>
                <PatientTypeBadge type={appt.patientType} />
                <Money amount={appt.fee} currency={appt.currency} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <DemoNotice>
        <strong className="text-foreground">Production data.</strong> You are
        viewing real platform records — patient details are confidential and
        covered by the Health Data &amp; Confidentiality policy.
      </DemoNotice>

      {dialogs}
    </div>
  );
}
