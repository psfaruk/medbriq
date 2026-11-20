"use client";

/**
 * Queue — today's patient queue: appointments for the Dhaka calendar day,
 * sorted by slot time. Status-aware actions per appointment card.
 */

import { useEffect, useState } from "react";
import {
  CalendarCheck2,
  ClipboardList,
  MapPin,
  Phone,
  StickyNote,
} from "lucide-react";
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
  dhakaToday,
  fmtDateLong,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import type { AppointmentDto } from "@/lib/types";
import { useDoctorDashboard } from "../context";
import { bySlotAsc, errMessage, genderLabel, timeBucket } from "../helpers";
import {
  AppointmentActionButtons,
  useApptActions,
} from "./appointment-parts";

export default function QueueSection() {
  const { reload } = useDoctorDashboard();
  const [items, setItems] = useState<AppointmentDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = () => {
    setLoading(true);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    let alive = true;
    apiGet<{ items: AppointmentDto[] }>(
      `/api/v1/doctor/appointments?date=${dhakaToday()}&limit=100`
    )
      .then((d) => {
        if (!alive) return;
        setItems([...d.items].sort(bySlotAsc));
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

  const counts = {
    total: items?.length ?? 0,
    pending: items?.filter((a) => a.status === "PENDING_APPROVAL").length ?? 0,
    confirmed: items?.filter((a) => a.status === "CONFIRMED").length ?? 0,
    done: items?.filter((a) => a.status === "COMPLETED").length ?? 0,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Today's patient queue"
        subtitle={`${fmtDateLong(`${dhakaToday()}T12:00:00.000Z`)} · ${counts.total} appointment${counts.total === 1 ? "" : "s"} · ${counts.pending} pending · ${counts.confirmed} confirmed · ${counts.done} completed`}
      />

      {loading && !items ? (
        <LoadingCard rows={4} />
      ) : error && !items ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck2 className="h-6 w-6" />}
          title="No appointments today"
          hint="When patients book your slots for today, the queue will show here in visit order. New bookings appear automatically on refresh."
          action={
            <p className="text-xs text-muted-foreground">
              Tip: manage your weekly schedule and chambers to open more slots.
            </p>
          }
        />
      ) : (
        <div className="space-y-3">
          {(["Morning", "Afternoon", "Evening"] as const).map((bucket) => {
            const bucketItems = items.filter(
              (a) => timeBucket(a.slotStart) === bucket
            );
            if (bucketItems.length === 0) return null;
            return (
              <div key={bucket} className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {bucket}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                    {bucketItems.length}
                  </span>
                </h2>
                {bucketItems.map((appt) => (
                  <QueueCard
                    key={appt.id}
                    appt={appt}
                    onAction={run}
                    onOpen={openDetails}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <DemoNotice>
        <strong className="text-foreground">Sandbox queue.</strong> Slots are
        30 minutes long. Completing a visit records it in the patient&apos;s
        history with you and establishes returning-patient pricing eligibility.
      </DemoNotice>

      {dialogs}
    </div>
  );
}

function QueueCard({
  appt,
  onAction,
  onOpen,
}: {
  appt: AppointmentDto;
  onAction: ReturnType<typeof useApptActions>["run"];
  onOpen: (appt: AppointmentDto) => void;
}) {
  return (
    <SectionCard>
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary">
          <span className="text-sm font-bold leading-none">
            {fmtTime(appt.slotStart)}
          </span>
          <span className="mt-1 text-[9px] font-medium uppercase leading-none">
            30 min
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="truncate text-left text-sm font-bold text-foreground hover:text-primary"
              onClick={() => onOpen(appt)}
            >
              {appt.patientName}
            </button>
            <PatientTypeBadge type={appt.patientType} />
            <AppointmentStatusBadge status={appt.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {appt.patientAge != null ? `${appt.patientAge} yrs` : "Age —"} ·{" "}
              {genderLabel(appt.patientGender)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {appt.patientPhone}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {appt.chamberName ?? "Chamber not set"}
            </span>
            <span className="font-mono">{appt.referenceCode}</span>
          </p>
          {appt.notes ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{appt.notes}</span>
            </p>
          ) : null}
          {appt.status === "COMPLETED" && appt.consultationNote ? (
            <p className="mt-2 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs text-foreground">
              <span className="font-semibold text-primary">
                Consultation note:{" "}
              </span>
              {appt.consultationNote}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-1.5">
            <PaymentStatusBadge status={appt.paymentStatus} />
            <span className="text-sm font-bold tabular-nums">
              <Money amount={appt.fee} currency={appt.currency} />
            </span>
          </div>
          <AppointmentActionButtons appt={appt} onAction={onAction} />
          {appt.status !== "PENDING_APPROVAL" && appt.status !== "CONFIRMED" ? (
            <ButtonLikeDetails onOpen={() => onOpen(appt)} />
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function ButtonLikeDetails({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      onClick={onOpen}
    >
      <ClipboardList className="h-3.5 w-3.5" />
      View details
    </button>
  );
}
