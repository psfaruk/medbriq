import { Badge } from "@/components/ui/badge";

/**
 * Medbriq brand logo — a bridge arch beneath a medical cross.
 * "Med" + "briq" (bridge) = connecting patients and doctors.
 * Inline SVG keeps it crisp at any size with zero external assets.
 */
export function BrandLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Medbriq logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="44" height="44" rx="12" className="fill-primary" />
      {/* bridge arch */}
      <path
        d="M10 34 C10 22, 38 22, 38 34"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <line x1="8" y1="34" x2="40" y2="34" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      {/* medical cross */}
      <path
        d="M24 10 v10 M19 15 h10"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-primary">Med</span>
      <span className="text-foreground">briq</span>
    </span>
  );
}

/** Small "demo environment" badge — Medbriq MVP ships with seed demo data. */
export function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="hidden sm:inline-flex items-center gap-1 border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Demo MVP
    </Badge>
  );
}
