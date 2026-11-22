"use client";

/**
 * Public doctor card — used by the homepage featured strip and the public
 * directory. Shows only public information (DoctorCard type); verification
 * status is displayed honestly (Verified / Pending).
 */

import { MapPin, CalendarClock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DoctorCard as DoctorCardType } from "@/lib/types";
import { useT } from "@/components/app/shared/ui-kit";
import {
  Money,
  Stars,
  UserAvatar,
  VerificationBadge,
} from "@/components/app/shared/ui-kit";
import { useAppStore } from "@/lib/app-state";
import { track } from "@/lib/analytics";
import { PortalLink } from "../shared";

export function DoctorCard({ doctor }: { doctor: DoctorCardType }) {
  const { t } = useT();
  const setPortalView = useAppStore((s) => s.setPortalView);
  const lang = useAppStore((s) => s.lang);

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={doctor.name}
          photoUrl={doctor.photoUrl}
          className="h-14 w-14 shrink-0 text-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <PortalLink
              view={{ name: "doctor", slug: doctor.slug }}
              onNavigate={() => track("profile_view_doctor")}
              className="min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            >
              <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary sm:text-base">
                {doctor.name}
              </h3>
            </PortalLink>
            <VerificationBadge status={doctor.verificationStatus} />
          </div>
          {doctor.specialties.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {doctor.specialties.map((s) => s.name).join(", ")}
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {doctor.city}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t("portal.doctor.experienceYears", { years: doctor.experienceYears })}</span>
            {doctor.hospitalName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{doctor.hospitalName}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {doctor.ratingCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Stars rating={doctor.ratingAvg} />
            <span>({doctor.ratingCount})</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-[#13A89E]" aria-hidden="true" />
          {doctor.nextAvailableLabel
            ? `${t("portal.doctor.nextAvailable")}: ${doctor.nextAvailableLabel}`
            : t("portal.doctor.noSlots")}
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("portal.doctor.feeNew")}
          </p>
          <p className="text-base font-bold text-foreground">
            <Money amount={doctor.consultationFee} currency={doctor.currency} />
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              track("profile_view_doctor");
              setPortalView({ name: "doctor", slug: doctor.slug }, { push: true });
            }}
            aria-label={`${t("portal.doctor.about")} ${doctor.name}`}
          >
            {lang === "bn" ? "বিস্তারিত" : "Details"}
          </Button>
          <Button
            size="sm"
            className="font-semibold"
            onClick={() => {
              track("booking_start");
              setPortalView({ name: "doctor", slug: doctor.slug }, { push: true });
            }}
          >
            {t("portal.cta.bookAppointment")}
            <ArrowRight className="ml-1 hidden h-3.5 w-3.5 sm:inline" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {doctor.requiresApproval && (
        <Badge variant="outline" className="mt-3 w-fit text-[10px] text-muted-foreground">
          Booking requests are reviewed by the doctor
        </Badge>
      )}
    </article>
  );
}
