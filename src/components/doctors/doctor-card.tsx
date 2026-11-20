"use client";

import type { DoctorCard as DoctorCardData } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/doctors/verification-badge";
import {
  Briefcase,
  Building2,
  CalendarClock,
  MapPin,
  Star,
  Video,
} from "lucide-react";

/** "Dr. Ayesha Rahman" -> "AR" (medical prefixes are stripped). */
export function getInitials(name: string): string {
  const parts = name
    .replace(/^(dr|prof|professor|md)\.?\s+/gi, "")
    .split(/\s+/)
    .filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** Format a BDT fee amount, e.g. 1500 -> "৳ 1,500". */
export function formatFee(amount: number): string {
  return `৳ ${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Reusable doctor directory card. The whole card is a single button that
 * navigates to the doctor profile view (SPA navigation via the app store).
 */
export function DoctorCard({ doctor }: { doctor: DoctorCardData }) {
  const navigate = useAppStore((state) => state.navigate);
  const specialtyLabel =
    doctor.specialties.map((s) => s.name).join(" · ") || "General practice";

  return (
    <button
      type="button"
      onClick={() => navigate({ name: "doctor", slug: doctor.slug })}
      aria-label={`View profile of ${doctor.name}, ${specialtyLabel}, ${doctor.city}`}
      className="group h-full w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="card-lift h-full gap-4 border-border/70 py-5 group-hover:border-primary/40">
        <CardContent className="flex h-full flex-col gap-3">
          {/* Header: avatar + name + specialty */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-14 w-14 border-2 border-primary/15">
                {doctor.photoUrl ? (
                  <AvatarImage src={doctor.photoUrl} alt={doctor.name} />
                ) : null}
                <AvatarFallback className="bg-brand-gradient text-sm font-semibold text-primary-foreground">
                  {getInitials(doctor.name)}
                </AvatarFallback>
              </Avatar>
              {doctor.nextAvailableLabel ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-card animate-pulse-soft"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-snug">
                {doctor.name}
              </p>
              <p className="mt-0.5 truncate text-sm text-primary/90 font-medium">
                {specialtyLabel}
              </p>
            </div>
          </div>

          <VerificationBadge status={doctor.verificationStatus} />

          {/* Meta rows */}
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <p className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
              <span className="truncate">{doctor.city}</span>
              <span aria-hidden="true">·</span>
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
              <span className="shrink-0">
                {doctor.experienceYears}+ yrs
              </span>
            </p>
            {doctor.hospitalName ? (
              <p className="flex min-w-0 items-center gap-1.5">
                <Building2
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{doctor.hospitalName}</span>
              </p>
            ) : null}
          </div>

          {doctor.nextAvailableLabel ? (
            <p className="flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              <CalendarClock
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              Available {doctor.nextAvailableLabel}
            </p>
          ) : null}

          {/* Footer: fee + rating + video indicator */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
            <span className="text-base font-bold text-primary">
              {formatFee(doctor.consultationFee)}
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                / visit
              </span>
            </span>
            <span className="flex items-center gap-2.5">
              {doctor.supportsVideo ? (
                <span
                  className="flex items-center gap-1 text-muted-foreground"
                  title="Video consultation available"
                >
                  <Video className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Video consultation available</span>
                </span>
              ) : null}
              {doctor.ratingAvg !== null ? (
                <span className="flex items-center gap-1 text-sm">
                  <Star
                    className="h-4 w-4 fill-warning text-warning"
                    aria-hidden="true"
                  />
                  <span className="font-medium">
                    {doctor.ratingAvg.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({doctor.ratingCount})
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No reviews yet
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

/** Skeleton placeholder matching the DoctorCard layout (for loading grids). */
export function DoctorCardSkeleton() {
  return (
    <Card className="h-full gap-4 py-5">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-5 w-28 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default DoctorCard;
