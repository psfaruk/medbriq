"use client";

/**
 * SpecialtiesScreen — specialty directory; tapping a specialty opens the
 * doctors screen pre-filtered via the searchPreset handoff.
 */

import {
  Activity,
  Baby,
  Bone,
  Brain,
  Eye,
  HeartPulse,
  Stethoscope,
  Syringe,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type { SpecialtyInfo } from "@/lib/types";
import {
  ErrorState,
  LoadingCard,
  PageHeader,
  useT,
} from "@/components/app/shared/ui-kit";
import { setSearchPreset, useApiData } from "../parts";

/** Best-effort icon mapping; anything unknown falls back to Activity. */
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  heart: HeartPulse,
  cardiology: HeartPulse,
  "internal-medicine": Stethoscope,
  medicine: Stethoscope,
  diabetology: Activity,
  pediatrics: Baby,
  child: Baby,
  gynecology: Baby,
  orthopedics: Bone,
  bone: Bone,
  neurology: Brain,
  brain: Brain,
  ophthalmology: Eye,
  eye: Eye,
  dentistry: Syringe,
  dental: Syringe,
  ent: UserRound,
  surgery: Syringe,
  dermatology: Activity,
  psychiatry: Brain,
};

function iconFor(slug: string): LucideIcon {
  const key = slug.toLowerCase();
  for (const [needle, icon] of Object.entries(ICONS)) {
    if (key.includes(needle)) return icon;
  }
  return Activity;
}

const ICON_TONES = [
  "bg-primary-soft text-primary",
  "bg-teal-50 text-teal-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-500",
  "bg-emerald-50 text-emerald-600",
  "bg-violet-50 text-violet-600",
];

export default function SpecialtiesScreen() {
  const { t, lang } = useT();
  const resetPatient = useAppStore((s) => s.resetPatient);
  const { data, loading, error, reload } = useApiData<{ items: SpecialtyInfo[] }>(
    () => apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties"),
    []
  );

  const openSpecialty = (slug: string) => {
    setSearchPreset({ specialty: slug });
    resetPatient({ name: "doctors" });
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("home.specialties")}
        subtitle="Browse doctors by medical specialty"
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <LoadingCard rows={1} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((s, i) => {
            const Icon = iconFor(s.slug);
            const tone = ICON_TONES[i % ICON_TONES.length];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => openSpecialty(s.slug)}
                className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 text-center shadow-soft card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {lang === "bn" && s.nameBn ? s.nameBn : s.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.doctorCount} {s.doctorCount === 1 ? "doctor" : "doctors"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
