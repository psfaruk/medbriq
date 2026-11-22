"use client";

/**
 * Find Medi Doctor brand marks — a clean medical cross + pulse motif in the
 * platform blue (#1769AA), teal accent (#13A89E).
 */
export function BrandLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" fill="url(#mbd-lg)" />
      <path
        d="M24 11c-1.1 0-2 .9-2 2v4.5h-4.5c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2H22V31c0 1.1.9 2 2 2s2-.9 2-2v-4.5h4.5c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2H26V13c0-1.1-.9-2-2-2Z"
        fill="white"
      />
      <path
        d="M11 29.5h4.2l2.3-4.6 3.1 8.2 2.9-6 2 2.4H31"
        stroke="#13A89E"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="mbd-lg" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#1769AA" />
          <stop offset="1" stopColor="#1487B8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandWordmark({
  className = "",
  showSuffix = true,
}: {
  className?: string;
  showSuffix?: boolean;
}) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-secondary">Find </span>
      <span className="text-primary">Medi </span>
      <span className="text-foreground">Doctor</span>
      {showSuffix ? (
        <span className="sr-only"> — find and book verified doctors</span>
      ) : null}
    </span>
  );
}

export function BrandLockup({
  size = "md",
  tagline = true,
}: {
  size?: "sm" | "md";
  tagline?: boolean;
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "sm" ? "text-base" : "text-xl";
  return (
    <span className="flex items-center gap-2">
      <BrandLogo className={dim} />
      <span className="flex flex-col leading-none">
        <BrandWordmark className={text} />
        {tagline ? (
          <span className="hidden sm:block text-[10px] font-medium tracking-wide text-muted-foreground mt-0.5">
            Find &amp; book verified doctors
          </span>
        ) : null}
      </span>
    </span>
  );
}
