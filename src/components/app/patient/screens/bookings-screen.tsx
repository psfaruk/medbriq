"use client";

/**
 * BookingsScreen — upcoming / history tabs over the patient's appointments.
 * Card tap opens the full appointment details screen.
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarX2, ChevronRight, MapPin, Stethoscope } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type { AppointmentDto } from "@/lib/types";
import {
  AppointmentStatusBadge,
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PatientTypeBadge,
  PaymentStatusBadge,
  useT,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { useApiData } from "../parts";

function AppointmentCard({ appointment }: { appointment: AppointmentDto }) {
  const pushPatient = useAppStore((s) => s.pushPatient);
  const a = appointment;
  return (
    <button
      type="button"
      onClick={() => pushPatient({ name: "appointment", id: a.id })}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {a.doctor?.name ?? "Doctor"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {a.doctor?.specialties?.join(", ") ?? ""}
            </p>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{fmtDateTime(a.slotStart)}</span>
        {a.chamberName ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {a.chamberName}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AppointmentStatusBadge status={a.status} />
          <PaymentStatusBadge status={a.paymentStatus} />
          {a.patientType ? <PatientTypeBadge type={a.patientType} /> : null}
          {a.type === "VIDEO" ? (
            <Badge variant="outline" className="text-[10px]">
              Video
            </Badge>
          ) : null}
        </div>
        <span className="text-sm font-bold text-foreground">
          <Money amount={a.fee} currency={a.currency} />
        </span>
      </div>
    </button>
  );
}

export default function BookingsScreen() {
  const { t } = useT();
  const resetPatient = useAppStore((s) => s.resetPatient);
  const { data, loading, error, reload } = useApiData<{ items: AppointmentDto[] }>(
    () => apiGet<{ items: AppointmentDto[] }>("/api/v1/appointments"),
    []
  );

  const { upcoming, history } = useMemo(() => {
    const items = data?.items ?? [];
    const now = Date.now();
    const upcomingItems = items
      .filter(
        (a) =>
          (a.status === "PENDING_APPROVAL" || a.status === "CONFIRMED") &&
          new Date(a.slotEnd).getTime() > now
      )
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
    const historyItems = items
      .filter(
        (a) =>
          !(
            (a.status === "PENDING_APPROVAL" || a.status === "CONFIRMED") &&
            new Date(a.slotEnd).getTime() > now
          )
      )
      .sort((a, b) => b.slotStart.localeCompare(a.slotStart));
    return { upcoming: upcomingItems, history: historyItems };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("nav.bookings")} />
        <LoadingCard rows={4} />
        <LoadingCard rows={4} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("nav.bookings")} />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  const emptyAction = (
    <Button size="sm" onClick={() => resetPatient({ name: "doctors" })}>
      {t("home.findDoctor")}
    </Button>
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t("nav.bookings")} />

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">
            {t("appointments.upcoming")} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            {t("appointments.history")} ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 className="h-6 w-6" />}
              title={t("appointments.empty")}
              hint={t("appointments.emptyHint")}
              action={emptyAction}
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 className="h-6 w-6" />}
              title={t("appointments.empty")}
              hint={t("appointments.emptyHint")}
              action={emptyAction}
            />
          ) : (
            <div className="space-y-3">
              {history.map((a) => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
