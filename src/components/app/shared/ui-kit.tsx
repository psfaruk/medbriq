"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  Inbox,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Clock,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/app-state";
import { translate } from "@/lib/i18n";

/**
 * MedBricBD shared UI kit — the reusable primitives every interface uses
 * (master prompt §10: reusable component library, consistent spacing and
 * colors, loading/empty/error states everywhere).
 */

// ── i18n hook (single source for all components) ────────────────────
export function useT() {
  const lang = useAppStore((s) => s.lang);
  return {
    lang,
    t: (key: string, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
  };
}

// ── Money ───────────────────────────────────────────────────────────
export function Money({
  amount,
  currency = "BDT",
  className,
}: {
  amount: number;
  currency?: string;
  className?: string;
}) {
  const formatted =
    currency === "BDT"
      ? `৳ ${Math.round(amount).toLocaleString("en-US")}`
      : `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}

// ── Status badges ───────────────────────────────────────────────────
const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  CONFIRMED:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  CANCELLED_BY_PATIENT:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  CANCELLED_BY_DOCTOR:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  NO_SHOW:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  EXPIRED:
    "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
};

const VERIFICATION_STYLES: Record<string, string> = {
  VERIFIED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  PENDING:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  UNDER_REVIEW:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  MORE_INFO:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  REJECTED:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
};

const PATIENT_TYPE_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  RETURNING:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
  FOLLOW_UP:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  const { t } = useT();
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", APPOINTMENT_STATUS_STYLES[status] ?? "")}
    >
      {t(`status.${status}`)}
    </Badge>
  );
}

export function VerificationBadge({ status }: { status: string }) {
  const { t } = useT();
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", VERIFICATION_STYLES[status] ?? "")}
    >
      {status === "VERIFIED" ? (
        <ShieldCheck className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {status === "VERIFIED" ? t("common.verified") : status.replaceAll("_", " ")}
    </Badge>
  );
}

export function PatientTypeBadge({ type }: { type: string | null }) {
  const { t } = useT();
  if (!type) return null;
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", PATIENT_TYPE_STYLES[type] ?? "")}
    >
      {t(`type.${type}`)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const style =
    status === "PAID"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "PENDING"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "REFUNDED"
          ? "bg-slate-100 text-slate-600 border-slate-200"
          : "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <Badge variant="outline" className={cn("font-medium", style)}>
      {t(`pay.${status}`)}
    </Badge>
  );
}

// ── Avatar helper ───────────────────────────────────────────────────
export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  name,
  photoUrl,
  className = "h-10 w-10",
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {photoUrl ? <AvatarImage src={photoUrl} alt={name} /> : null}
      <AvatarFallback className="bg-primary-soft text-primary font-semibold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

// ── Page header (master prompt §11: clear title, one primary action) ─
export function PageHeader({
  title,
  subtitle,
  action,
  onBack,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {onBack ? (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={onBack}
            aria-label="Go back"
          >
            <span aria-hidden="true">←</span>
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary-soft text-primary"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-600"
        : tone === "warning"
          ? "bg-amber-50 text-amber-600"
          : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              toneClass
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ── Section card ────────────────────────────────────────────────────
export function SectionCard({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card shadow-soft",
        className
      )}
    >
      {title || action ? (
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          {title ? (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          ) : null}
          {action}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  );
}

// ── Stars ───────────────────────────────────────────────────────────
export function Stars({
  rating,
  count,
  className,
}: {
  rating: number | null;
  count?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="text-xs font-semibold text-foreground tabular-nums">
        {rating !== null ? rating.toFixed(1) : "—"}
      </span>
      {typeof count === "number" ? (
        <span className="text-xs text-muted-foreground">
          ({count})
        </span>
      ) : null}
    </span>
  );
}

// ── Loading / empty / error states ──────────────────────────────────
export function LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-3"
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      {hint ? (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useT();
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center dark:border-rose-900 dark:bg-rose-950/30",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
        <AlertCircle className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">
        {message ?? t("common.error")}
      </p>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-2"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

// ── Demo data notice (honesty requirement, master prompt §10) ──────
export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
      {children ?? (
        <>
          <strong className="text-foreground">Demo environment.</strong> All
          doctors, hospitals and payments shown are fictional sandbox data —
          no real medical service or money movement.
        </>
      )}
    </p>
  );
}

// ── Guest avatar placeholder ────────────────────────────────────────
export function GuestAvatar({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
        className
      )}
    >
      <UserRound className="h-5 w-5" />
    </span>
  );
}

// ── Dhaka-time display helpers (Asia/Dhaka, UTC+6, no DST) ─────────
// Import these instead of reimplementing date formatting per screen.

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

export function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

/** Today's Dhaka date as YYYY-MM-DD. */
export function dhakaToday(): string {
  return new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
}

/** Add days to a YYYY-MM-DD string (Dhaka calendar arithmetic). */
export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
