"use client";

import { Check, X, KeyRound, Server, MapPin, PhoneCall } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionCard } from "@/components/app/shared/ui-kit";

/**
 * Security & RBAC — static role/capability matrix and operational notes.
 * The matrix mirrors the guards enforced in the API routes (docs/ARCHITECTURE
 * corrections): each dashboard only ever touches its own data.
 */

type Capability = {
  key: string;
  label: string;
  hint: string;
  roles: Record<"PATIENT" | "DOCTOR" | "HOSPITAL" | "ADMIN", boolean>;
};

const CAPABILITIES: Capability[] = [
  {
    key: "booking",
    label: "Book & pay for appointments",
    hint: "Patient-side booking flow with sandbox payments",
    roles: { PATIENT: true, DOCTOR: false, HOSPITAL: false, ADMIN: false },
  },
  {
    key: "own-records",
    label: "View own medical records",
    hint: "Visit history, family members, notifications",
    roles: { PATIENT: true, DOCTOR: false, HOSPITAL: false, ADMIN: false },
  },
  {
    key: "doctor-queue",
    label: "Manage own appointment queue",
    hint: "Approve, reject, complete, no-show, notes",
    roles: { PATIENT: false, DOCTOR: true, HOSPITAL: false, ADMIN: false },
  },
  {
    key: "fee-settings",
    label: "Set own fee structure",
    hint: "New / returning / follow-up fees, versioned",
    roles: { PATIENT: false, DOCTOR: true, HOSPITAL: false, ADMIN: false },
  },
  {
    key: "hospital-branches",
    label: "Manage own hospital & branches",
    hint: "Branches, departments, attached doctors",
    roles: { PATIENT: false, DOCTOR: false, HOSPITAL: true, ADMIN: false },
  },
  {
    key: "verifications",
    label: "Verify doctors & hospitals",
    hint: "BMDC review, hospital approvals",
    roles: { PATIENT: false, DOCTOR: false, HOSPITAL: false, ADMIN: true },
  },
  {
    key: "flags",
    label: "Toggle platform feature flags",
    hint: "Telehealth, payments, records, reviews",
    roles: { PATIENT: false, DOCTOR: false, HOSPITAL: false, ADMIN: true },
  },
  {
    key: "ledger",
    label: "Payment ledger & refunds",
    hint: "Sandbox refunds, commission settings",
    roles: { PATIENT: false, DOCTOR: false, HOSPITAL: false, ADMIN: true },
  },
];

const ROLE_COLUMNS = [
  { key: "PATIENT", label: "Patient" },
  { key: "DOCTOR", label: "Doctor" },
  { key: "HOSPITAL", label: "Hospital" },
  { key: "ADMIN", label: "Super admin" },
] as const;

function PermissionCell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
      <Check className="h-3.5 w-3.5" />
      <span className="sr-only">Allowed</span>
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-muted-foreground/50">
      <X className="h-3.5 w-3.5" />
      <span className="sr-only">Not allowed</span>
    </span>
  );
}

export default function SecuritySection() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Security & RBAC"
        subtitle="Role separation map, session policy and data-residency posture."
      />

      {/* ── Emergency banner ─────────────────────────────────────── */}
      <div
        role="alert"
        className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/30"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
          <PhoneCall className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-rose-700 dark:text-rose-300">
          <strong>Call 999 for medical emergencies.</strong> This platform is
          for appointments and records — never for emergency care.
        </p>
      </div>

      {/* ── Permission matrix ────────────────────────────────────── */}
      <SectionCard
        title="Role permission matrix"
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-card hover:bg-card">
                <TableHead>Capability</TableHead>
                {ROLE_COLUMNS.map((r) => (
                  <TableHead key={r.key} className="text-center">
                    {r.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {CAPABILITIES.map((cap) => (
                <TableRow key={cap.key} className="text-sm">
                  <TableCell>
                    <span className="block font-medium text-foreground">
                      {cap.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {cap.hint}
                    </span>
                  </TableCell>
                  {ROLE_COLUMNS.map((r) => (
                    <TableCell key={r.key} className="text-center">
                      <PermissionCell allowed={cap.roles[r.key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="border-t border-border/70 px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
          Enforced server-side by role guards on every API route — the UI hides
          what the API would reject anyway.
        </p>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Sessions ───────────────────────────────────────────── */}
        <SectionCard title="Sessions & access">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="leading-relaxed text-muted-foreground">
                <strong className="text-foreground">HTTP-only session cookies.</strong>{" "}
                Sign-in issues a server-side session; tokens are never exposed to
                client JavaScript.
              </p>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Protected admin actions.</strong>{" "}
                Admin accounts cannot suspend themselves or other admins from the
                console; every admin action lands in the audit trail.
              </p>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Active sessions note.</strong>{" "}
                Demo accounts share one session per browser; signing out revokes
                the server session immediately.
              </p>
            </li>
          </ul>
        </SectionCard>

        {/* ── Data residency ─────────────────────────────────────── */}
        <SectionCard title="Data residency & storage">
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Server className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="leading-relaxed text-muted-foreground">
                <strong className="text-foreground">SQLite locally, Firestore when configured.</strong>{" "}
                The dual-store data layer keeps data in the deployment region —
                no cross-region replication in this demo.
              </p>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Bangladesh-first.</strong>{" "}
                Times shown in Asia/Dhaka (UTC+6), currency BDT, phone numbers
                +880. Emergency routing stays on the national 999 service.
              </p>
            </li>
            <li className="flex items-start gap-2.5">
              <Badge
                variant="outline"
                className="mt-0.5 shrink-0 border-amber-200 bg-amber-50 font-medium text-amber-700"
              >
                Telehealth gated
              </Badge>
              <p className="leading-relaxed text-muted-foreground">
                Video consultations stay disabled until the DGHS telemedicine
                compliance review passes — enforced by a feature flag, not by
                hiding UI.
              </p>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
