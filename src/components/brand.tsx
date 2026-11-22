/**
 * Find Medi Doctor brand marks — a medical cross over a bridge arch
 * (connecting patients and doctors) in the platform blue (#1769AA)
 * with a teal accent (#13A89E). Inline SVG keeps it crisp at any size
 * with zero external assets.
 */
export function BrandLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Find Medi Doctor logo"
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
      <span className="text-secondary">Find </span>
      <span className="text-primary">Medi </span>
      <span className="text-foreground">Doctor</span>
    </span>
  );
}
