"use client";

/** Public specialties directory → pre-filtered doctor search. */

import { Skeleton } from "@/components/ui/skeleton";
import type { SpecialtyInfo } from "@/lib/types";
import { getPreloadedBoot } from "@/lib/boot-data";
import { useT } from "@/components/app/shared/ui-kit";
import { track } from "@/lib/analytics";
import {
  Breadcrumbs,
  ContentIcon,
  PortalLink,
  useTrackPageView,
} from "../shared";

export default function SpecialtiesView() {
  const { t } = useT();
  useTrackPageView("specialties");
  const specialties: SpecialtyInfo[] = getPreloadedBoot()?.specialties ?? [];

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.nav.specialties") }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.section.specialties")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("portal.section.specialtiesSub")}
        </p>
      </header>

      {specialties.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((s) => (
            <li key={s.slug}>
              <PortalLink
                view={{ name: "doctors", specialty: s.slug }}
                ctaLabel="specialty-card"
                onNavigate={() => track("doctor_search")}
                className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  {s.icon ? (
                    <ContentIcon name={s.icon} className="h-6 w-6" />
                  ) : (
                    <span className="text-base font-extrabold">
                      {s.name.slice(0, 2)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground group-hover:text-primary sm:text-base">
                    {s.name}
                  </span>
                  {s.nameBn && (
                    <span className="block text-xs text-muted-foreground">{s.nameBn}</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {s.doctorCount}
                </span>
              </PortalLink>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
