"use client";

import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarSearch,
  ClipboardCheck,
  Landmark,
  Lock,
  MapPinned,
  Scale,
  ShieldCheck,
  UserCheck,
  Video,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * ComplianceView — "Trust & Compliance" summary of
 * docs/ARCHITECTURE_CORRECTIONS.md for stakeholders: the Phase 0 regulatory
 * gate, module flags, engineering workstreams and the standing policies that
 * govern what may ship. Text content only (no external links).
 */

type ModuleRow = {
  name: string;
  status: "ENABLED" | "DISABLED";
  scope: string;
  note: string;
};

const MODULES: ModuleRow[] = [
  {
    name: "Doctor Discovery",
    status: "ENABLED",
    scope: "Bangladesh only",
    note: "Directory & search of BMDC-registered doctors; lowest regulatory risk.",
  },
  {
    name: "Appointment Booking",
    status: "ENABLED",
    scope: "Bangladesh, local store",
    note: "Physical chamber visits; the Prisma-backed store is required (residency gate).",
  },
  {
    name: "Telehealth",
    status: "DISABLED",
    scope: "—",
    note: "Phase 0 regulatory gate — DGHS/BMDC telemedicine compliance required before the flag can flip.",
  },
  {
    name: "Online Payments",
    status: "DISABLED",
    scope: "—",
    note: "Legal & payment-service-provider approval required (no custody, no wallets).",
  },
];

const WORKSTREAMS = [
  {
    name: "Core Platform & Discovery",
    owns: "Auth, users, doctor profiles, verification workflow, search, specialties, hospitals.",
  },
  {
    name: "Booking Engine & Fees",
    owns: "Slot engine, appointment status machine, doctor-wise fee system, patient classification, pricing snapshots, visit history.",
  },
  {
    name: "Scheduling & Locations",
    owns: "Doctor-to-location model, per-location schedules, exceptions, capacity, multi-chamber (phased).",
  },
  {
    name: "Compliance & Infrastructure",
    owns: "Module flags & eligibility controls, data residency, backups/DR, cost monitoring, audit trail, launch checklist.",
  },
];

const POLICIES = [
  {
    title: "Server-side pricing with snapshots",
    body: "Fees are computed, validated and snapshotted on the server at booking time — the client is never trusted, and later fee changes never mutate a confirmed appointment.",
  },
  {
    title: "No payment custody",
    body: "No funds flow through the platform. Payment collection, split settlement and wallets stay disabled until legal and PSP approvals exist; patients pay at the chamber.",
  },
  {
    title: "Data residency review before any foreign-region storage",
    body: "Bangladeshi patient data may not be stored outside Bangladesh unless a recorded residency decision explicitly permits it. The fee/booking module runs only on the locally-hosted store.",
  },
  {
    title: "Human approval gates",
    body: "Enabling any regulated module (telehealth, payments) or launching production requires a recorded, audit-logged human sign-off — approval is a release artifact, not a conversation.",
  },
];

export default function ComplianceView() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Trust &amp; Compliance
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          How Medbriq decides what may ship: the Phase 0 regulatory gate,
          module flags, engineering workstreams and the standing policies from
          our architecture review.
        </p>
      </header>

      {/* Phase 0 gate */}
      <Alert className="border-warning/50 bg-warning/10">
        <Landmark className="h-4 w-4 text-warning" aria-hidden="true" />
        <AlertTitle className="flex flex-wrap items-center gap-2">
          Phase 0 — Market Validation &amp; Regulatory Feasibility
          <Badge
            variant="outline"
            className="border-warning/50 bg-warning/10 text-warning"
          >
            IN PROGRESS — gates all regulated services
          </Badge>
        </AlertTitle>
        <AlertDescription>
          <span className="block">
            DGHS National Telehealth Guidelines · BMDC telemedicine guidance ·
            licensing analysis · data residency opinion · payments feasibility.
          </span>
          <span className="mt-1 block">
            No regulated clinical service may ship before this gate completes
            with a signed go/no-go memo.
          </span>
        </AlertDescription>
      </Alert>

      {/* Module status table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Module status
          </CardTitle>
          <CardDescription>
            Independent modules with feature flags and eligibility controls —
            a disabled module stays fully disabled (API, UI, background jobs)
            and answers with the gate reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="medbriq-scroll overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Module</TableHead>
                  <TableHead className="min-w-24">Status</TableHead>
                  <TableHead className="min-w-36">Scope</TableHead>
                  <TableHead className="min-w-64">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((module) => (
                  <TableRow key={module.name}>
                    <TableCell className="font-medium">{module.name}</TableCell>
                    <TableCell>
                      {module.status === "ENABLED" ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          ENABLED
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-border/60 text-muted-foreground"
                        >
                          DISABLED
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {module.scope}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {module.note}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Video className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Video consultations are therefore not bookable in this demo — they
            return after regulatory approval.
          </p>
        </CardContent>
      </Card>

      {/* Engineering workstreams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden="true" />
            Engineering workstreams
          </CardTitle>
          <CardDescription>
            Four coordinated workstreams (instead of overlapping teams) — and
            no workstream may enable a module flag on its own.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {WORKSTREAMS.map((stream, index) => (
              <li
                key={stream.name}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{stream.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {stream.owns}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Key policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
            Key policies
          </CardTitle>
          <CardDescription>
            Standing rules extracted from the architecture review — they apply
            to every team and every release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {POLICIES.map((policy) => (
              <li key={policy.title} className="rounded-lg border p-4">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {policy.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {policy.body}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Scope summary strip */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          <div className="flex items-start gap-2.5">
            <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Initial market</p>
              <p className="text-xs text-muted-foreground">
                Bangladesh only — per-country feasibility checklist before any
                expansion flag flips.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CalendarSearch className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">MVP scope</p>
              <p className="text-xs text-muted-foreground">
                Verified doctor discovery + reliable physical chamber booking,
                including doctor-wise new/returning fees.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Verified doctors</p>
              <p className="text-xs text-muted-foreground">
                BMDC registration checked by admins before the Verified badge
                and booking are enabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <Alert>
        <Lock className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Why some features are off</AlertTitle>
        <AlertDescription>
          Telehealth and online payments are deliberately disabled until the
          Phase 0 regulatory review and the required human approvals are
          recorded. Everything you can use in this demo — discovery, chamber
          booking, new/returning patient pricing — runs inside those
          boundaries.
        </AlertDescription>
      </Alert>

      <p className="flex items-center gap-1.5 pb-2 text-xs text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Source: internal architecture corrections review — summarized for
        stakeholders.
      </p>
    </div>
  );
}
