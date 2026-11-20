"use client";

import { useCallback } from "react";
import {
  HeartPulse,
  Database,
  Timer,
  Cpu,
  Server,
  RefreshCw,
  Users,
  Stethoscope,
  Building2,
  CalendarCheck,
  CreditCard,
  LifeBuoy,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api-client";
import {
  PageHeader,
  StatCard,
  SectionCard,
  LoadingCard,
  ErrorState,
} from "@/components/app/shared/ui-kit";
import type { SystemHealth } from "../types";
import { useAdminData } from "../use-admin-data";
import { fmtUptime } from "../parts";

/**
 * System — health snapshot from /api/v2/admin/system: database latency,
 * data store kind, runtime info and per-entity record counts.
 */
export default function SystemSection() {
  const loader = useCallback(
    () => apiGet<SystemHealth>("/api/v2/admin/system"),
    []
  );
  const { data, error, loading, reload } = useAdminData(loader);

  const checkedAt = loading ? null : new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="System health"
        subtitle="Live snapshot of the application, database and data volumes."
        action={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <LoadingCard rows={4} />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          {/* ── Status row ───────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard className="lg:col-span-1">
              <div className="flex flex-col items-start gap-3 py-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <HeartPulse className="h-6 w-6" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-lg font-bold text-foreground">
                    {data.status === "healthy" ? "Healthy" : data.status}
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700"
                    >
                      Live
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    API, database and store adapters responding.
                  </p>
                </div>
                {checkedAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Last check:{" "}
                    {checkedAt.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                      timeZone: "Asia/Dhaka",
                    })}{" "}
                    (Dhaka)
                  </p>
                ) : null}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-2">
              <StatCard
                label="DB latency"
                value={`${data.dbLatencyMs} ms`}
                hint="SELECT 1 round-trip"
                icon={<Timer className="h-4 w-4" />}
                tone="success"
              />
              <StatCard
                label="Data store"
                value={data.dataStore === "prisma" ? "Prisma" : "Firestore"}
                hint={
                  data.dataStore === "prisma"
                    ? "SQLite via Prisma ORM"
                    : "Firestore native mode"
                }
                icon={<Database className="h-4 w-4" />}
                tone="primary"
              />
              <StatCard
                label="Uptime"
                value={fmtUptime(data.runtime.uptimeSeconds)}
                hint="Current server process"
                icon={<Cpu className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* ── Runtime ───────────────────────────────────────────── */}
          <SectionCard title="Runtime">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-muted/50 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Server className="h-3 w-3" /> Node
                </dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {data.runtime.node}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cpu className="h-3 w-3" /> Platform
                </dt>
                <dd className="mt-1 font-mono text-sm font-semibold uppercase text-foreground">
                  {data.runtime.platform}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="h-3 w-3" /> Uptime
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {fmtUptime(data.runtime.uptimeSeconds)}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Database className="h-3 w-3" /> Store kind
                </dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {data.dataStore}
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* ── Entity counts ────────────────────────────────────── */}
          <SectionCard title="Data volumes">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              <StatCard
                label="Users"
                value={data.counts.users}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="Doctors"
                value={data.counts.doctors}
                icon={<Stethoscope className="h-4 w-4" />}
              />
              <StatCard
                label="Hospitals"
                value={data.counts.hospitals}
                icon={<Building2 className="h-4 w-4" />}
              />
              <StatCard
                label="Appointments"
                value={data.counts.appointments}
                icon={<CalendarCheck className="h-4 w-4" />}
              />
              <StatCard
                label="Payments"
                value={data.counts.payments}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <StatCard
                label="Tickets"
                value={data.counts.tickets}
                icon={<LifeBuoy className="h-4 w-4" />}
              />
              <StatCard
                label="Flags"
                value={data.counts.flags}
                icon={<ToggleRight className="h-4 w-4" />}
              />
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
