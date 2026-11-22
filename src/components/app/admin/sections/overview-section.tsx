"use client";

import { useCallback } from "react";
import {
  Users,
  UserRound,
  Stethoscope,
  ShieldCheck,
  Clock,
  CalendarCheck,
  Hourglass,
  Building2,
  Video,
  CreditCard,
  Percent,
  Database,
  Activity,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import type { AdminStats, AuditLogItem, HospitalInfo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  PageHeader,
  StatCard,
  SectionCard,
  LoadingCard,
  ErrorState,
  DemoNotice,
} from "@/components/app/shared/ui-kit";
import type {
  AdminHospitalItem,
  FeatureFlagItem,
  PlatformPayload,
  SystemHealth,
} from "../types";
import { AuditActionBadge } from "../parts";
import { useAdminData } from "../use-admin-data";

/**
 * Overview — global platform picture: headline counters, platform pulse
 * (feature flags / commission / data store) and the latest audit entries.
 *
 * Hospital verified/pending counts come from /api/v2/admin/hospitals; when
 * that endpoint errors the card falls back to the public directory count
 * with an honest warning instead of fake numbers.
 */

type OverviewPayload = {
  stats: AdminStats;
  flags: FeatureFlagItem[];
  platform: PlatformPayload;
  system: SystemHealth;
  hospitalsV2: { items: AdminHospitalItem[] } | null;
  hospitalsError: string | null;
  hospitalsPublic: HospitalInfo[];
  audit: AuditLogItem[];
};

function HospitalCountCard({
  hospitalsV2,
  hospitalsError,
  hospitalsPublic,
}: {
  hospitalsV2: { items: AdminHospitalItem[] } | null;
  hospitalsError: string | null;
  hospitalsPublic: HospitalInfo[];
}) {
  if (hospitalsV2) {
    const verified = hospitalsV2.items.filter(
      (h) => h.verificationStatus === "VERIFIED"
    ).length;
    const pending = hospitalsV2.items.filter((h) =>
      ["PENDING", "UNDER_REVIEW", "MORE_INFO"].includes(h.verificationStatus)
    ).length;
    return (
      <StatCard
        label="Hospitals"
        value={hospitalsV2.items.length}
        hint={`${verified} verified · ${pending} pending review`}
        icon={<Building2 className="h-4 w-4" />}
        tone="default"
      />
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Hospitals</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Building2 className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {hospitalsPublic.length}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
        <AlertTriangle className="h-3 w-3" />
        Verified/pending split unavailable
      </p>
      {hospitalsError ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
          Admin hospitals endpoint failed: {hospitalsError}
        </p>
      ) : null}
    </div>
  );
}

export default function OverviewSection({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const loader = useCallback(async (): Promise<OverviewPayload> => {
    const [stats, flags, platform, system, audit, hospitalsPublic] =
      await Promise.all([
        apiGet<AdminStats>("/api/v1/admin/stats"),
        apiGet<{ items: FeatureFlagItem[] }>("/api/v2/admin/flags"),
        apiGet<PlatformPayload>("/api/v2/admin/platform"),
        apiGet<SystemHealth>("/api/v2/admin/system"),
        apiGet<{ items: AuditLogItem[] }>("/api/v1/admin/audit-logs?limit=5"),
        apiGet<{ items: HospitalInfo[] }>("/api/v1/hospitals"),
      ]);
    // The v2 hospitals endpoint can fail (server-side query bug) — resolve it
    // defensively and keep the public directory as the honest fallback.
    let hospitalsV2: { items: AdminHospitalItem[] } | null = null;
    let hospitalsError: string | null = null;
    try {
      hospitalsV2 = await apiGet<{ items: AdminHospitalItem[] }>(
        "/api/v2/admin/hospitals"
      );
    } catch (err) {
      hospitalsError =
        err instanceof Error && err.message.length < 120
          ? err.message
          : "Endpoint returned a server error.";
    }
    return {
      stats,
      flags: flags.items,
      platform,
      system,
      hospitalsV2,
      hospitalsError,
      hospitalsPublic: hospitalsPublic.items,
      audit: audit.items,
    };
  }, []);

  const { data, error, loading, reload } = useAdminData(loader);

  const telehealth = data?.flags.find((f) => f.key === "telehealth");
  const onlinePayments = data?.flags.find((f) => f.key === "onlinePayments");
  const commission = data?.platform.settings.find(
    (s) => s.key === "commissionPercent"
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Global overview"
        subtitle="Platform-wide counters, feature gates and the latest admin activity."
      />

      {loading ? (
        <LoadingCard rows={4} />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          {/* ── Counters ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={data.stats.totalUsers}
              hint="All registered accounts"
              icon={<Users className="h-4 w-4" />}
              tone="primary"
            />
            <StatCard
              label="Patients"
              value={data.stats.totalPatients}
              icon={<UserRound className="h-4 w-4" />}
            />
            <StatCard
              label="Doctors"
              value={data.stats.totalDoctors}
              hint={`${data.stats.verifiedDoctors} verified`}
              icon={<Stethoscope className="h-4 w-4" />}
            />
            <StatCard
              label="Verified doctors"
              value={data.stats.verifiedDoctors}
              hint="Listed publicly"
              icon={<ShieldCheck className="h-4 w-4" />}
              tone="success"
            />
            <StatCard
              label="Pending doctors"
              value={data.stats.pendingDoctors}
              hint="Awaiting verification"
              icon={<Clock className="h-4 w-4" />}
              tone="warning"
            />
            <HospitalCountCard
              hospitalsV2={data.hospitalsV2}
              hospitalsError={data.hospitalsError}
              hospitalsPublic={data.hospitalsPublic}
            />
            <StatCard
              label="Appointments"
              value={data.stats.totalAppointments}
              hint={`${data.stats.confirmedAppointments} confirmed`}
              icon={<CalendarCheck className="h-4 w-4" />}
            />
            <StatCard
              label="Pending approvals"
              value={data.stats.pendingApprovals}
              hint="Doctor confirmations due"
              icon={<Hourglass className="h-4 w-4" />}
              tone="warning"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            {/* ── Platform pulse ─────────────────────────────────── */}
            <SectionCard
              title="Platform pulse"
              className="lg:col-span-2"
              action={
                <button
                  onClick={() => onNavigate("platform")}
                  className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                >
                  Manage
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              }
            >
              <ul className="space-y-3">
                <li className="flex items-start justify-between gap-3 rounded-xl bg-amber-50/70 px-3 py-2.5 dark:bg-amber-950/30">
                  <span className="flex items-start gap-2.5">
                    <Video className="mt-0.5 h-4 w-4 text-amber-600" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        Telehealth
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {telehealth
                          ? "Disabled — pending regulatory review (DGHS telemedicine compliance)."
                          : "Status unknown"}
                      </span>
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    Off
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      Online payments
                    </span>
                  </span>
                  {onlinePayments ? (
                    <Badge
                      variant="outline"
                      className={
                        onlinePayments.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }
                    >
                      {onlinePayments.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  ) : null}
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      Platform commission
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {commission ? `${commission.value}%` : "—"}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Data store</span>
                  </span>
                  <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">
                    {data.system.dataStore}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">DB latency</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {data.system.dbLatencyMs} ms
                  </span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Every flag and setting change is written to the audit trail.
              </p>
            </SectionCard>

            {/* ── Recent audit preview ───────────────────────────── */}
            <SectionCard
              title="Recent admin activity"
              className="lg:col-span-3"
              action={
                <button
                  onClick={() => onNavigate("audit")}
                  className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
                >
                  Full audit log
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              }
              contentClassName="p-0"
            >
              {data.audit.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No audit entries yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {data.audit.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 sm:px-5"
                    >
                      <AuditActionBadge action={log.action} />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {log.actorName ?? "System"}{" "}
                        <span className="text-muted-foreground">
                          · {log.entity}
                          {log.entityId ? ` ${log.entityId.slice(-6)}` : ""}
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Dhaka",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <DemoNotice />
        </>
      )}
    </div>
  );
}
