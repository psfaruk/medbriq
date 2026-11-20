"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Search } from "lucide-react";
import { apiGet, ApiCallError } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PatientTypeBadge,
  PaymentStatusBadge,
  fmtDate,
  fmtDateLong,
  fmtDateTime,
  fmtTime,
  useT,
} from "@/components/app/shared/ui-kit";
import type { HospitalAppointment } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-right text-sm text-foreground">{children}</div>
    </div>
  );
}

/** Full appointment detail dialog (opened from a table row / mobile card). */
function AppointmentDetailDialog({
  appointment,
  onOpenChange,
}: {
  appointment: HospitalAppointment | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  return (
    <Dialog open={appointment !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {appointment ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2.5">
                <span>{appointment.referenceCode}</span>
                <AppointmentStatusBadge status={appointment.status} />
              </DialogTitle>
              <DialogDescription>
                Booked {fmtDateTime(appointment.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div>
              <DetailRow label="Patient">
                <p className="font-medium">{appointment.patientName}</p>
                <p className="text-xs text-muted-foreground">
                  {appointment.patientPhone}
                </p>
              </DetailRow>
              <DetailRow label="Doctor">{appointment.doctorName}</DetailRow>
              <DetailRow label="Chamber">
                {appointment.chamberName ?? "—"}
              </DetailRow>
              <DetailRow label="Schedule">
                <p className="font-medium">{fmtDateLong(appointment.slotStart)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtTime(appointment.slotStart)} – {fmtTime(appointment.slotEnd)}
                </p>
              </DetailRow>
              <DetailRow label="Patient type">
                {appointment.patientType ? (
                  <PatientTypeBadge type={appointment.patientType} />
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Payment">
                <div className="flex items-center justify-end gap-2">
                  <PaymentStatusBadge status={appointment.paymentStatus} />
                </div>
              </DetailRow>
              <DetailRow label="Fee">
                <span className="font-semibold">
                  <Money
                    amount={appointment.fee}
                    currency={appointment.currency}
                  />
                </span>
              </DetailRow>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("hospitalNav.appointments")} · hospital view (read-only)
            </p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AppointmentsSection() {
  const { t } = useT();
  const [status, setStatus] = useState("ALL");
  const [items, setItems] = useState<HospitalAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HospitalAppointment | null>(null);

  const tabs = [
    { value: "ALL", label: "All" },
    { value: "PENDING_APPROVAL", label: t("status.PENDING_APPROVAL") },
    { value: "CONFIRMED", label: t("status.CONFIRMED") },
    { value: "COMPLETED", label: t("status.COMPLETED") },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  useEffect(() => {
    let cancelled = false;
    // "CANCELLED" spans two server statuses (patient/doctor), so it is
    // fetched unfiltered and narrowed client-side below.
    const url =
      status === "ALL" || status === "CANCELLED"
        ? "/api/v2/hospital/appointments"
        : `/api/v2/hospital/appointments?status=${status}`;
    apiGet<{ items: HospitalAppointment[] }>(url)
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
  }, [status, reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((a) => {
      if (status === "CANCELLED" && !a.status.startsWith("CANCELLED")) {
        return false;
      }
      if (!q) return true;
      return (
        a.patientName.toLowerCase().includes(q) ||
        a.doctorName.toLowerCase().includes(q) ||
        a.referenceCode.toLowerCase().includes(q)
      );
    });
  }, [items, query, status]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hospitalNav.appointments")}
        subtitle="Every appointment booked with doctors attached to your hospital."
      />

      <div className="space-y-3">
        <Tabs
          value={status}
          onValueChange={(v) => {
            setItems(null);
            setStatus(v);
          }}
        >
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto w-full min-w-max gap-1 bg-muted/60 p-1 sm:w-auto">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-3 py-1.5 text-xs font-medium sm:text-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t("common.search")}: patient, doctor or reference`}
            className="pl-9"
            aria-label="Search appointments"
          />
        </div>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => setReload((n) => n + 1)}
        />
      ) : items === null ? (
        <LoadingCard rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={query ? "No matching appointments" : "No appointments here"}
          hint={
            query
              ? "Try a different patient, doctor or reference code."
              : "Appointments appear here as patients book your doctors."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date &amp; time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Chamber</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="cursor-pointer"
                    >
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
                        {a.patientType ? (
                          <PatientTypeBadge type={a.patientType} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                        <Money amount={a.fee} currency={a.currency} />
                      </TableCell>
                      <TableCell>
                        <AppointmentStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={a.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {a.patientName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.referenceCode} · {fmtDate(a.slotStart)} ·{" "}
                      {fmtTime(a.slotStart)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {a.doctorName}
                  {a.chamberName ? ` · ${a.chamberName}` : ""}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <AppointmentStatusBadge status={a.status} />
                  <PaymentStatusBadge status={a.paymentStatus} />
                  {a.patientType ? (
                    <PatientTypeBadge type={a.patientType} />
                  ) : null}
                  <span className="ml-auto text-sm font-semibold">
                    <Money amount={a.fee} currency={a.currency} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <AppointmentDetailDialog
        appointment={selected}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      />
    </div>
  );
}
