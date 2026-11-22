"use client";

import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Percent, Wallet } from "lucide-react";
import { apiGet, ApiCallError } from "@/lib/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DemoNotice,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PaymentStatusBadge,
  SectionCard,
  StatCard,
  fmtDate,
  useT,
} from "@/components/app/shared/ui-kit";
import type { HospitalRevenue } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

/** Format an amount the same way the shared Money component does. */
function fmtMoney(amount: number, currency = "BDT"): string {
  return currency === "BDT"
    ? `৳ ${Math.round(amount).toLocaleString("en-US")}`
    : `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

/** "2026-08" → "Aug ’26" (UTC-safe, no locale date parsing pitfalls). */
function monthLabel(month: string): string {
  const short = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${short} ’${month.slice(2, 4)}`;
}

/** Pure-CSS monthly revenue bar chart (no chart library). */
function MonthlyBars({
  monthly,
  currency,
}: {
  monthly: HospitalRevenue["monthly"];
  currency: string;
}) {
  const max = Math.max(...monthly.map((m) => m.revenue), 0);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[340px]">
        <div className="flex h-44 items-end gap-3 sm:gap-5">
          {monthly.map((m) => {
            const pct = max > 0 ? (m.revenue / max) * 100 : 0;
            return (
              <div
                key={m.month}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${m.visits} visit${m.visits === 1 ? "" : "s"}`}
              >
                <span className="text-[10px] font-semibold tabular-nums text-foreground">
                  {max > 0 ? <Money amount={m.revenue} currency={currency} /> : "—"}
                </span>
                <div
                  className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-primary to-secondary transition-all"
                  style={{
                    height: `${Math.max(pct, m.revenue > 0 ? 4 : 1.5)}%`,
                  }}
                  role="img"
                  aria-label={`${monthLabel(m.month)}: ${Math.round(m.revenue)} ${currency} from ${m.visits} visits`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-3 border-t border-border/70 pt-2 sm:gap-5">
          {monthly.map((m) => (
            <div key={m.month} className="flex-1 text-center">
              <p className="text-[10px] font-medium text-muted-foreground">
                {monthLabel(m.month)}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground/70">
                {m.visits} visit{m.visits === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RevenueSection() {
  const { t } = useT();
  const [data, setData] = useState<HospitalRevenue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiGet<HospitalRevenue>("/api/v2/hospital/revenue")
      .then((d) => {
        if (cancelled) return;
        setData(d);
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
    return (
      <div className="space-y-5">
        <PageHeader
          title={t("hospitalNav.revenue")}
          subtitle="Completed-visit revenue and the platform commission split."
        />
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
        <DemoNotice>
          <strong className="text-foreground">Commission split.</strong>{" "}
          Revenue figures come from completed visits — platform commission is
          settled from collected consultation fees.
        </DemoNotice>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={t("hospitalNav.revenue")}
          subtitle="Completed-visit revenue and the platform commission split."
        />
        <LoadingCard rows={6} />
      </div>
    );
  }

  const { totals, commissionPercent } = data;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hospitalNav.revenue")}
        subtitle="Completed-visit revenue and the platform commission split."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross revenue"
          value={fmtMoney(totals.grossRevenue, totals.currency)}
          hint="All completed visits"
          icon={<Wallet className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Platform commission"
          value={fmtMoney(totals.commission, totals.currency)}
          hint={`${commissionPercent}% of gross revenue`}
          icon={<Percent className="h-4 w-4" />}
          tone="warning"
        />
        <StatCard
          label="Net revenue"
          value={fmtMoney(totals.netRevenue, totals.currency)}
          hint="Gross minus platform commission"
          icon={<Banknote className="h-4 w-4" />}
          tone="success"
        />
        <StatCard
          label="Completed visits"
          value={totals.completedVisits}
          hint="Life-to-date completed consultations"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <SectionCard title="Monthly revenue">
        {totals.completedVisits === 0 || data.monthly.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No completed visits yet — monthly revenue appears here after
            consultations are completed.
          </p>
        ) : (
          <MonthlyBars monthly={data.monthly} currency={totals.currency} />
        )}
      </SectionCard>

      <SectionCard title="Recent payments" contentClassName="p-0 sm:p-0">
        {data.payments.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            No completed-visit payments yet.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {fmtDate(p.slotStart)}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {p.referenceCode}
                      </TableCell>
                      <TableCell className="text-sm">{p.doctorName}</TableCell>
                      <TableCell className="text-sm">{p.patientName}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                        <Money amount={p.fee} currency={p.currency} />
                      </TableCell>
                      <TableCell
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        title={p.txnRef ?? undefined}
                      >
                        {p.method ?? "—"}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={p.paymentStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border/70 md:hidden">
              {data.payments.map((p) => (
                <li key={p.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.patientName}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {p.referenceCode}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      <Money amount={p.fee} currency={p.currency} />
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {p.doctorName} · {fmtDate(p.slotStart)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wide">
                      {p.method ?? "—"}
                    </span>
                    <PaymentStatusBadge status={p.paymentStatus} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      <DemoNotice>
        <strong className="text-foreground">Commission split.</strong>{" "}
        Revenue figures come from completed visits — platform commission is
        settled from collected consultation fees.
      </DemoNotice>
    </div>
  );
}
