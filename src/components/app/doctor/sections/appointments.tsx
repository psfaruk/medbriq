"use client";

/**
 * Appointments — full appointment manager: status filter tabs (client-side
 * on one fetched list), search by patient name / reference code, responsive
 * table (md+) or card rows (mobile), details dialog with status actions.
 */

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PatientTypeBadge,
  PaymentStatusBadge,
  fmtDate,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import type { AppointmentDto } from "@/lib/types";
import { useDoctorDashboard } from "../context";
import { APPOINTMENT_FILTERS, bySlotDesc, errMessage } from "../helpers";
import { useApptActions } from "./appointment-parts";

export default function AppointmentsSection() {
  const { reload } = useDoctorDashboard();
  const [items, setItems] = useState<AppointmentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const refresh = () => {
    setLoading(true);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    let alive = true;
    apiGet<{ items: AppointmentDto[] }>("/api/v1/doctor/appointments?limit=200")
      .then((d) => {
        if (!alive) return;
        setItems([...d.items].sort(bySlotDesc));
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(errMessage(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const { run, openDetails, dialogs } = useApptActions(() => {
    refresh();
    reload();
  });

  const filtered = useMemo(() => {
    if (!items) return [];
    const group = APPOINTMENT_FILTERS.find((f) => f.key === filter);
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (group?.statuses && !group.statuses.includes(a.status)) return false;
      if (q) {
        const hay = `${a.patientName} ${a.referenceCode} ${a.patientPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", items?.length ?? 0);
    for (const f of APPOINTMENT_FILTERS) {
      if (!f.statuses || !items) continue;
      map.set(
        f.key,
        items.filter((a) => f.statuses?.includes(a.status)).length
      );
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Appointments"
        subtitle="Every booking across all statuses — click a row for the full record and status actions."
      />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient name, reference code or phone…"
            className="pl-9"
            aria-label="Search appointments"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto sm:w-fit">
            {APPOINTMENT_FILTERS.map((f) => (
              <TabsTrigger
                key={f.key}
                value={f.key}
                className="gap-1.5 text-xs sm:text-sm"
              >
                {f.label}
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums">
                  {counts.get(f.key) ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading && !items ? (
        <LoadingCard rows={5} />
      ) : error && !items ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={query ? "No matching appointments" : "Nothing in this view"}
          hint={
            query
              ? `No appointments match "${query}" in this tab. Try a different search or clear the filter.`
              : "Bookings with this status will appear here."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Date &amp; time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="w-[90px] text-right">Fee</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[120px]">Payment</TableHead>
                  <TableHead>Chamber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((appt) => (
                  <TableRow
                    key={appt.id}
                    className="cursor-pointer"
                    onClick={() => openDetails(appt)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <span className="block text-sm font-semibold text-foreground">
                        {fmtDate(appt.slotStart)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtTime(appt.slotStart)} – {fmtTime(appt.slotEnd)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-[180px] truncate text-sm font-semibold text-foreground">
                        {appt.patientName}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {appt.referenceCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PatientTypeBadge type={appt.patientType} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">
                      <Money amount={appt.fee} currency={appt.currency} />
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={appt.paymentStatus} />
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                      {appt.chamberName ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card rows */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((appt) => (
              <li key={appt.id}>
                <button
                  className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40"
                  onClick={() => openDetails(appt)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {appt.patientName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(appt.slotStart)} · {fmtTime(appt.slotStart)} –{" "}
                        {fmtTime(appt.slotEnd)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      <Money amount={appt.fee} currency={appt.currency} />
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <AppointmentStatusBadge status={appt.status} />
                    <PatientTypeBadge type={appt.patientType} />
                    <PaymentStatusBadge status={appt.paymentStatus} />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {appt.referenceCode}
                    {appt.chamberName ? ` · ${appt.chamberName}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <DemoNotice>
        <strong className="text-foreground">Pricing snapshots.</strong> Each
        booking stores the fee that applied when it was priced (fee version) —
        changing your fee settings never rewrites existing bookings.
      </DemoNotice>

      {dialogs}
    </div>
  );
}
