"use client";

/**
 * VvsSection — the doctor's Verified Visits hub.
 *
 * Tabs: Today's queue (check-in + verification state per appointment),
 * QR scanner (camera + manual code), Visit history (receipts, corrections).
 * Completion ALWAYS goes through /api/v2/vvs/complete which enforces
 * ownership, chamber, status and credential checks server-side.
 */

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarCheck2,
  ClipboardList,
  History,
  Loader2,
  QrCode,
  ScanLine,
} from "lucide-react";
import {
  AppointmentStatusBadge,
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  PatientTypeBadge,
  PaymentStatusBadge,
  SectionCard,
  fmtDateLong,
  fmtTime,
  useT,
} from "@/components/app/shared/ui-kit";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";
import type { VvsQueueItem } from "@/lib/vvs-types";
import VvsFormDialog from "@/components/vvs/form-dialog";
import VvsReceiptDialog from "@/components/vvs/receipt";
import VvsScanner from "./scanner";
import VvsHistory from "./history";

export type VvsTab = "queue" | "scanner" | "history";

export default function VvsSection() {
  const { t } = useT();
  const [tab, setTab] = useState<VvsTab>("queue");
  const [items, setItems] = useState<VvsQueueItem[] | null>(null);
  const [policy, setPolicy] = useState<string>("B");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiGet<{ date: string; policy: string; items: VvsQueueItem[] }>(
      "/api/v2/vvs/doctor/today"
    )
      .then((d) => {
        if (!alive) return;
        setItems(d.items);
        setPolicy(d.policy);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey, t]);

  const tabs: { key: VvsTab; label: string; icon: typeof QrCode }[] = [
    { key: "queue", label: t("vvs.doctor.queue"), icon: ClipboardList },
    { key: "scanner", label: t("vvs.doctor.scanner"), icon: ScanLine },
    { key: "history", label: t("vvs.doctor.history"), icon: History },
  ];

  const counts = {
    total: items?.length ?? 0,
    confirmed: items?.filter((a) => a.status === "CONFIRMED").length ?? 0,
    done: items?.filter((a) => a.visit).length ?? 0,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("vvs.doctor.title")}
        subtitle={`${t("vvs.doctor.subtitle")} — ${t("vvs.doctor.policy")}: ${policy}`}
      />

      <div
        className="flex flex-wrap gap-1.5 rounded-xl border bg-card p-1.5"
        role="tablist"
        aria-label={t("vvs.doctor.title")}
      >
        {tabs.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:px-4 ${
              tab === tb.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tb.icon className="h-4 w-4" aria-hidden="true" />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <QueueTab
          items={items}
          loading={loading}
          error={error}
          counts={counts}
          onReload={reload}
          onGoScan={() => setTab("scanner")}
        />
      ) : null}
      {tab === "scanner" ? <VvsScanner onCompleted={reload} /> : null}
      {tab === "history" ? <VvsHistory /> : null}
    </div>
  );
}

// ── today's queue ─────────────────────────────────────────────────────

function QueueTab({
  items,
  loading,
  error,
  counts,
  onReload,
  onGoScan,
}: {
  items: VvsQueueItem[] | null;
  loading: boolean;
  error: string | null;
  counts: { total: number; confirmed: number; done: number };
  onReload: () => void;
  onGoScan: () => void;
}) {
  const { t } = useT();

  if (loading && !items) return <LoadingCard rows={5} />;
  if (error && !items) return <ErrorState message={error} onRetry={onReload} />;
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarCheck2 className="h-6 w-6" />}
        title={t("vvs.doctor.queueEmpty")}
        hint={t("vvs.doctor.queueHint")}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {fmtDateLong(`${new Date().toISOString().slice(0, 10)}T12:00:00.000Z`)}{" "}
        · {counts.total} · {counts.confirmed} {t("common.pending").toLowerCase()} ·{" "}
        {counts.done} {t("vvs.card.visitRecorded").toLowerCase()}
      </p>
      {items.map((a) => (
        <QueueCard key={a.id} item={a} onReload={onReload} onGoScan={onGoScan} />
      ))}
    </div>
  );
}

function QueueCard({
  item,
  onReload,
  onGoScan,
}: {
  item: VvsQueueItem;
  onReload: () => void;
  onGoScan: () => void;
}) {
  const { t } = useT();
  const [formOpen, setFormOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState("");
  const [patientCodeBusy, setPatientCodeBusy] = useState(false);
  const [patientCodeMsg, setPatientCodeMsg] = useState<string | null>(null);

  const submitPatientCode = async () => {
    if (patientCode.trim().length !== 6) return;
    setPatientCodeBusy(true);
    setPatientCodeMsg(null);
    try {
      await apiPost(`/api/v2/vvs/patient-confirmation/${item.id}`, {
        code: patientCode.trim(),
      });
      setPatientCodeMsg("ok");
      onReload();
    } catch (err) {
      setPatientCodeMsg(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setPatientCodeBusy(false);
    }
  };

  const visit = item.visit;
  const corrected = visit?.correctionStatus === "CORRECTED";
  const active = item.status === "CONFIRMED" && (!visit || corrected);
  const checkedIn = !!item.checkInAt;

  const checkIn = async () => {
    setBusy(true);
    try {
      await apiPost(`/api/v2/vvs/check-in/${item.id}`, {});
      onReload();
    } catch {
      /* the reload communicates the outcome */
    } finally {
      setBusy(false);
    }
  };

  const completeByManual = async () => {
    setBusy(true);
    setManualError(null);
    try {
      await apiPost(`/api/v2/vvs/complete/${item.id}`, {
        referenceCode: item.referenceCode,
        credential: manualCode.trim().toUpperCase(),
      });
      setManualOpen(false);
      setManualCode("");
      onReload();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const completeByReference = async () => {
    setBusy(true);
    try {
      await apiPost(`/api/v2/vvs/complete/${item.id}`, {});
      onReload();
    } catch {
      /* state refresh communicates the outcome */
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard>
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary">
          <span className="text-sm font-bold leading-none">
            {fmtTime(item.slotStart)}
          </span>
          <span className="mt-1 text-[9px] font-medium uppercase leading-none">
            #{item.serialNumber ?? "—"}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {item.patientName}
            </span>
            <PatientTypeBadge type={item.patientType} />
            <AppointmentStatusBadge status={item.status} />
            {checkedIn ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {t("vvs.doctor.checkedIn")} {fmtTime(item.checkInAt as string)}
              </span>
            ) : null}
            {visit && !corrected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                {visit.receiptNumber}
                {visit.patientConfirmationStatus === "CONFIRMED"
                  ? ` · ${t("vvs.doctor.confirmConfirmed")}`
                  : visit.patientConfirmationStatus === "PENDING"
                    ? ` · ${t("vvs.doctor.confirmPending")}`
                    : ""}
              </span>
            ) : null}
            {corrected ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {t("vvs.card.corrected")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {[
                item.patientAge != null ? `${item.patientAge} yrs` : null,
                item.patientGender ?? null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
            <span>{item.patientPhone}</span>
            <span>{item.chamberName ?? "Chamber not set"}</span>
            <span className="font-mono">{item.referenceCode}</span>
          </p>
        </div>

        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center gap-1.5">
            <PaymentStatusBadge status={item.paymentStatus} />
            <span className="text-sm font-bold tabular-nums">
              ৳{item.fee.toLocaleString("en-US")}
            </span>
          </div>

          {active ? (
            <div className="flex flex-wrap gap-1.5">
              {!checkedIn ? (
                <Button variant="outline" size="sm" onClick={checkIn} disabled={busy}>
                  {t("vvs.doctor.checkIn")}
                </Button>
              ) : null}
              <Button size="sm" onClick={onGoScan}>
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                {t("vvs.doctor.verifyBtn")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                <QrCode className="h-4 w-4" aria-hidden="true" />
                {t("vvs.doctor.printForm")}
              </Button>
            </div>
          ) : visit && !corrected ? (
            <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
              {t("vvs.card.viewReceipt")}
            </Button>
          ) : null}

          {active ? (
            <div className="w-full sm:w-auto">
              {manualOpen ? (
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  <input
                    className="h-9 w-full rounded-lg border bg-background px-2.5 font-mono text-xs uppercase placeholder:normal-case sm:w-32"
                    placeholder={t("vvs.doctor.manualCode")}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    aria-label={t("vvs.doctor.manualCode")}
                  />
                  <Button size="sm" onClick={completeByManual} disabled={busy || manualCode.trim().length < 6}>
                    {t("vvs.doctor.complete")}
                  </Button>
                </div>
              ) : (
                <button
                  className="text-left text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  onClick={() => setManualOpen(true)}
                >
                  {t("vvs.doctor.manualCode")} — {t("vvs.doctor.manualTitle")}
                </button>
              )}
              {manualError ? (
                <p className="mt-1 text-[11px] font-medium text-destructive" role="alert">
                  {manualError}
                </p>
              ) : null}
              <button
                className="mt-1 block text-left text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                onClick={completeByReference}
                disabled={busy}
                title={t("vvs.doctor.completeByRefHint")}
              >
                {t("vvs.doctor.completeByRef")}
              </button>
            </div>
          ) : null}

          {/* Mode B: enter the patient's confirmation code after completion */}
          {!active && visit && !corrected &&
          visit.patientConfirmationStatus === "PENDING" ? (
            <div className="w-full sm:w-auto">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <input
                  className="h-9 w-full rounded-lg border bg-background px-2.5 font-mono text-sm tracking-widest sm:w-28"
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={patientCode}
                  onChange={(e) =>
                    setPatientCode(e.target.value.replace(/\D/g, ""))
                  }
                  aria-label={t("vvs.doctor.patientCodeTitle")}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={submitPatientCode}
                  disabled={patientCodeBusy || patientCode.length !== 6}
                >
                  {patientCodeBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {t("vvs.doctor.patientCodeBtn")}
                </Button>
              </div>
              {patientCodeMsg ? (
                <p
                  className={`mt-1 text-[11px] font-medium ${
                    patientCodeMsg === "ok" ? "text-emerald-600" : "text-destructive"
                  }`}
                  role="status"
                >
                  {patientCodeMsg === "ok"
                    ? t("vvs.doctor.confirmConfirmed")
                    : patientCodeMsg}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <VvsFormDialog
        appointmentId={item.id}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
      <VvsReceiptDialog
        appointmentId={item.id}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </SectionCard>
  );
}
