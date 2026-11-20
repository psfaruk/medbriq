import {
  Baby,
  Bone,
  Brain,
  BrainCircuit,
  Ear,
  Heart,
  HeartPulse,
  Layers,
  Smile,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

/**
 * lucide icon names used by Specialty.icon (see prisma/seed.ts).
 * Kept as an explicit map so unknown database values can never crash the UI.
 */
const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Stethoscope,
  HeartPulse,
  Layers,
  Baby,
  Heart,
  Bone,
  Ear,
  Brain,
  BrainCircuit,
  Smile,
};

/**
 * Render a specialty icon by its lucide component name.
 * Unknown / missing names fall back to a stethoscope.
 */
export function SpecialtyIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: string | null;
  className?: string;
}) {
  const Icon = (icon != null ? SPECIALTY_ICONS[icon] : undefined) ?? Stethoscope;
  return <Icon className={className} aria-hidden="true" />;
}

export default SpecialtyIcon;
