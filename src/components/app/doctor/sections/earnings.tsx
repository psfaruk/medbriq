"use client";

/**
 * Earnings — stat cards from dashboard stats.earnings, payment-method
 * breakdown derived from completed appointments, and a pure-div monthly
 * revenue bar chart (6 most recent months with data).
 */

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Percent, Wallet } from "lucide-react";
import {
  DemoNotice,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  SectionCard,
  StatCard,
  fmtDate,
} from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import type { AppointmentDto } from "@/lib/types";
import { useDoctorDashboard } from "../context";
import { dhakaMonthKey, errMessage, fmtMoney } from "../helpers";

export default function EarningsSection() {
  const { data, loading, error, reload } = useDoctorDashboard();
  const [completed, setCompleted] = useState<AppointmentDto[] | null>(null);
  const [completedError, setCompletedError] = useState<string | null>(null);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    apiGet<{ items: AppointmentDto[] }>(
      "/api/v1/doctor/appointments?status=COMPLETED&limit=200"
    )
      .then((d) => {
        if (!alive) return;
        setCompleted(d.items);
        setCompletedError(null);
        setCompletedLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setCompletedError(errMessage(err));
        setCompletedLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const breakdown = useMemo(() => {
    if (!completed) return null;
    let paidOnline = 0;
    let paidOnlineCount = 0;
    let payAtChamber = 0;
    let payAtChamberCount = 0;
    for (const appt of completed) {
      if (appt.paymentStatus === "PAID") {
        paidOnline += appt.fee;
        paidOnlineCount += 1;
      } else {
        payAtChamber += appt.fee;
        payAtChamberCount += 1;
      }
    }
    return { paidOnline, paidOnlineCount, payAtChamber, payAtChamberCount };
  }, [completed]);

  const months = useMemo(() => {
    if (!completed || completed.length === 0) return [];
    const byMonth = new Map<string, number>();
    for (const appt of completed) {
      const key = dhakaMonthKey(appt.slotStart);
      byMonth.set(key, (byMonth.get(key) ?? 0) + appt.fee);
    }
    const sorted = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.slice(0, 6).reverse(); // oldest → newest, left to right
  }, [completed]);

  const maxMonth = months.length > 0 ? Math.max(...months.map((m) => m[1])) : 0;
  const stats = data?.stats;

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={4} />
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const currency = stats?.earnings.currency ?? "BDT";
  const commissionPct =
    stats && stats.earnings.completedRevenue > 0
      ? Math.round(
          (stats.earnings.platformCommission /
            stats.earnings.completedRevenue) *
            100
        )
      : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Earnings"
        subtitle="Revenue from completed consultations. Platform commission 10% — payouts settled monthly."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross revenue"
          value={stats ? fmtMoney(stats.earnings.completedRevenue, currency) : "—"}
          hint={`${stats?.completedTotal ?? 0} completed consultations`}
          icon={<Banknote className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Platform commission"
          value={stats ? fmtMoney(stats.earnings.platformCommission, currency) : "—"}
          hint={`${commissionPct}% of gross (simulated)`}
          icon={<Percent className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Net earnings"
          value={stats ? fmtMoney(stats.earnings.netEarnings, currency) : "—"}
          hint="What would be paid out"
          icon={<Wallet className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Average per visit"
          value={
            stats && stats.completedTotal > 0
              ? fmtMoney(
                  Math.round(
                    (stats.earnings.netEarnings / stats.completedTotal) * 100
                  ) / 100,
                  currency
                )
              : "—"
          }
          hint="Net, across all completed visits"
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      {/* Payment breakdown */}
      <SectionCard title="Payment method breakdown">
        {completedLoading && !completed ? (
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-muted" />
            <div className="h-10 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : completedError ? (
          <ErrorState
            message={completedError}
            onRetry={() => {
              setCompletedLoading(true);
              setTick((t) => t + 1);
            }}
          />
        ) : breakdown ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-emerald-50/50 px-4 py-3 dark:bg-emerald-950/20">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CreditCard className="h-3.5 w-3.5" />
                Paid online
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                <Money amount={breakdown.paidOnline} currency={currency} />
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {breakdown.paidOnlineCount} appointment
                {breakdown.paidOnlineCount === 1 ? "" : "s"} settled at booking
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Banknote className="h-3.5 w-3.5" />
                Pay at chamber
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                <Money amount={breakdown.payAtChamber} currency={currency} />
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {breakdown.payAtChamberCount} appointment
                {breakdown.payAtChamberCount === 1 ? "" : "s"} collected in
                person
              </p>
            </div>
          </div>
        ) : null}
      </SectionCard>

      {/* Monthly bar chart (pure divs) */}
      <SectionCard title="Monthly completed revenue">
        {completedLoading && !completed ? (
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        ) : months.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No completed appointments yet — revenue will chart here after your
            first completed consultation.
          </p>
        ) : (
          <>
            <div className="flex h-48 items-end gap-2 sm:gap-4">
              {months.map(([month, amount]) => {
                const height =
                  maxMonth > 0 ? Math.max(6, Math.round((amount / maxMonth) * 100)) : 0;
                const [year, mon] = month.split("-");
                const label = new Date(
                  Number(year),
                  Number(mon) - 1,
                  1
                ).toLocaleDateString("en-US", { month: "short" });
                return (
                  <div
                    key={month}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-foreground sm:text-xs">
                      ৳{amount.toLocaleString("en-US")}
                    </span>
                    <div
                      className="w-full max-w-[52px] rounded-t-lg bg-primary/90 transition-all hover:bg-primary"
                      style={{ height: `${height}%` }}
                      role="img"
                      aria-label={`${label} ${year}: ৳${amount}`}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                      {label} {year.slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Showing the {months.length} most recent month
              {months.length === 1 ? "" : "s"} with completed visits
              {completed && completed.length > 0
                ? ` (latest visit ${fmtDate(
                    [...completed].sort((a, b) =>
                      b.slotStart.localeCompare(a.slotStart)
                    )[0].slotStart
                  )})`
                : ""}
              .
            </p>
          </>
        )}
      </SectionCard>

      <DemoNotice>
        <strong className="text-foreground">Earnings.</strong> Platform
        commission is 10% of collected consultation fees. Payouts are
        settled to your registered account.
      </DemoNotice>
    </div>
  );
}
