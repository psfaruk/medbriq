"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Shared presentational bits for the admin panel sections
 * (badges that don't exist in the global ui-kit, plus tiny helpers).
 */

// ── Auth provider badge ─────────────────────────────────────────────
const PROVIDER_STYLES: Record<string, string> = {
  credentials: "bg-slate-100 text-slate-600 border-slate-200",
  google: "bg-violet-50 text-violet-700 border-violet-200",
  phone: "bg-teal-50 text-teal-700 border-teal-200",
};

const PROVIDER_LABELS: Record<string, string> = {
  credentials: "Email & password",
  google: "Google",
  phone: "Phone OTP",
};

export function ProviderBadge({ provider }: { provider: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        PROVIDER_STYLES[provider] ?? PROVIDER_STYLES.credentials
      )}
    >
      {PROVIDER_LABELS[provider] ?? provider}
    </Badge>
  );
}

// ── Account status badge ────────────────────────────────────────────
export function AccountStatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      )}
    >
      {active ? "Active" : "Suspended"}
    </Badge>
  );
}

// ── Payment method badge (bKash / Nagad / Card) ─────────────────────
const METHOD_STYLES: Record<string, string> = {
  BKASH: "bg-pink-50 text-pink-700 border-pink-200",
  NAGAD: "bg-orange-50 text-orange-700 border-orange-200",
  CARD: "bg-slate-100 text-slate-600 border-slate-200",
};

const METHOD_LABELS: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  CARD: "Card",
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", METHOD_STYLES[method] ?? METHOD_STYLES.CARD)}
    >
      {METHOD_LABELS[method] ?? method}
    </Badge>
  );
}

// ── Payment ledger status badge (SUCCEEDED/REFUNDED/PENDING/FAILED) ─
const LEDGER_STATUS_STYLES: Record<string, string> = {
  SUCCEEDED:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-slate-100 text-slate-600 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
};

const LEDGER_STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: "Succeeded",
  REFUNDED: "Refunded",
  PENDING: "Pending",
  FAILED: "Failed",
};

export function LedgerStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        LEDGER_STATUS_STYLES[status] ?? LEDGER_STATUS_STYLES.PENDING
      )}
    >
      {LEDGER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── Support ticket badges ───────────────────────────────────────────
export function TicketStatusBadge({ status }: { status: string }) {
  const style =
    status === "OPEN"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "IN_PROGRESS"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : status === "RESOLVED"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-600 border-slate-200";
  const label =
    status === "OPEN"
      ? "Open"
      : status === "IN_PROGRESS"
        ? "In progress"
        : status === "RESOLVED"
          ? "Resolved"
          : "Closed";
  return (
    <Badge variant="outline" className={cn("font-medium", style)}>
      {label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const urgent = priority === "URGENT";
  const high = priority === "HIGH";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        urgent
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : high
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-slate-100 text-slate-600 border-slate-200"
      )}
    >
      {urgent ? "Urgent" : high ? "High" : priority === "NORMAL" ? "Normal" : "Low"}
    </Badge>
  );
}

// ── Audit action badge (color by verb) ──────────────────────────────
function auditTone(action: string): {
  className: string;
  label: string;
} {
  const a = action.toUpperCase();
  if (/(VERIF|APPROV)/.test(a)) {
    return {
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: action,
    };
  }
  if (/(REJECT|REFUND|DELETE|SUSPEND|REMOVE|FAIL|ERROR)/.test(a)) {
    return {
      className: "bg-rose-50 text-rose-700 border-rose-200",
      label: action,
    };
  }
  if (/(UPDAT|CHANGE|SET|TOGGLE|CREATE|ADD|REGISTER|LOGIN|DECISION|MORE_INFO)/.test(a)) {
    return {
      className: "bg-blue-50 text-blue-700 border-blue-200",
      label: action,
    };
  }
  return { className: "bg-slate-100 text-slate-600 border-slate-200", label: action };
}

export function AuditActionBadge({ action }: { action: string }) {
  const tone = auditTone(action);
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[10px] font-medium", tone.className)}
    >
      {tone.label}
    </Badge>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Pretty-print an audit-log meta JSON string; null-safe. */
export function prettyMeta(meta: string | null): string {
  if (!meta) return "—";
  try {
    const parsed: unknown = JSON.parse(meta);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return meta;
  }
}

/** Format process uptime seconds as "2d 3h 4m" style. */
export function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}
