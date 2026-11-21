"use client";

/**
 * Admin analytics (spec §17): privacy-respecting first-party counters —
 * funnel signals (views → searches → bookings) and per-event counts.
 * Nothing personal or medical is ever recorded, by construction.
 */

import { useEffect, useState } from "react";
import { Eye, Search, CalendarCheck, UserPlus, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/lib/api-client";
import { useT, ErrorState, StatCard } from "@/components/app/shared/ui-kit";

type AnalyticsResponse = {
  events: { name: string; count: number; lastAt: string }[];
  total: number;
  funnel: {
    pageViews: number;
    doctorSearches: number;
    bookingStarts: number;
    bookingConfirmed: number;
    registrationStarts: number;
    registrationCompletes: number;
  };
  note: string;
};

export default function AnalyticsSection() {
  const { t } = useT();
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await apiGet<AnalyticsResponse>("/api/v1/admin/analytics");
        if (!alive) return;
        setData(d);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [nonce]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            First-party funnel signals — privacy-respecting by design.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <Card className="border-[#13A89E]/30 bg-[#13A89E]/5 shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f8f87]" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-foreground">
            Only whitelisted event names and coarse counts are stored. No
            search text, no health details, no personal identifiers — ever.
            {data ? ` ${data.note}` : ""}
          </p>
        </CardContent>
      </Card>

      {error && <ErrorState message={error} onRetry={() => setNonce((n) => n + 1)} />}
      {loading && !data && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading analytics…
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Page views"
              value={String(data.funnel.pageViews)}
              icon={<Eye className="h-4 w-4" aria-hidden="true" />}
            />
            <StatCard
              label="Doctor searches"
              value={String(data.funnel.doctorSearches)}
              icon={<Search className="h-4 w-4" aria-hidden="true" />}
            />
            <StatCard
              label="Bookings started"
              value={String(data.funnel.bookingStarts)}
              icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}
            />
            <StatCard
              label="Bookings confirmed"
              value={String(data.funnel.bookingConfirmed)}
              icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserPlus className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
                  Registration funnel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <FunnelBar label="Started" value={data.funnel.registrationStarts} />
                <FunnelBar label="Completed" value={data.funnel.registrationCompletes} />
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Booking funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <FunnelBar label="Started" value={data.funnel.bookingStarts} />
                <FunnelBar label="Confirmed" value={data.funnel.bookingConfirmed} />
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">All events ({data.total} total)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map((e) => (
                    <TableRow key={e.name}>
                      <TableCell className="font-mono text-xs">{e.name}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {e.count}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(e.lastAt).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.events.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        No events recorded yet — browse the public portal to generate some.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            {t("common.loading") ? "" : ""}Counters reset when the server restarts (in-memory,
            privacy-preserving). For production-grade retention, pipe the same
            whitelisted events into a first-party warehouse.
          </p>
        </>
      )}
    </div>
  );
}

function FunnelBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, value * 10); // visual scale for demo volumes
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[#13A89E] transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
