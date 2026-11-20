import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { patientTypeLabel } from "@/lib/fee-labels";

/**
 * Patient-type badge (docs/FEE_SYSTEM.md §2.4): NEW → neutral slate,
 * RETURNING → emerald, FOLLOW_UP → amber. A null type (appointments priced
 * before per-doctor fee classification) renders a muted "legacy" badge.
 */
const PATIENT_TYPE_STYLES: Record<string, string> = {
  NEW: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  RETURNING:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  FOLLOW_UP:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function PatientTypeBadge({
  type,
  className,
}: {
  type: string | null | undefined;
  className?: string;
}) {
  // Pre-fee-module appointment: subtle muted badge.
  if (!type) {
    return (
      <Badge
        variant="outline"
        className={cn("border-border/60 text-muted-foreground", className)}
        title="Booked before per-doctor fee pricing was introduced"
      >
        Legacy
      </Badge>
    );
  }
  const style = PATIENT_TYPE_STYLES[type];
  if (!style) {
    return (
      <Badge variant="outline" className={className}>
        {patientTypeLabel(type)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(style, className)}>
      {patientTypeLabel(type)}
    </Badge>
  );
}
