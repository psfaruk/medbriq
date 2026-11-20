"use client";

/**
 * DoctorProfileScreen — public doctor profile: header, fee structure,
 * about, chambers, weekly schedule, reviews, and the booking CTA.
 */

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Video,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type { DoctorDetail, ReviewItem } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  SectionCard,
  Stars,
  UserAvatar,
  VerificationBadge,
  useT,
} from "@/components/app/shared/ui-kit";
import { InfoRow, languageLabel, minutesLabel, timeAgo } from "../parts";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorProfileScreen({ slug }: { slug: string }) {
  const { t } = useT();
  const pushPatient = useAppStore((s) => s.pushPatient);
  const popPatient = useAppStore((s) => s.popPatient);
  const [detail, setDetail] = useState<DoctorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [telehealthOn, setTelehealthOn] = useState(false);

  useEffect(() => {
    let active = true;
    apiGet<DoctorDetail>(`/api/v1/doctors/${slug}`)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : t("doctor.notFound"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, reloadKey]);

  // reviews + telehealth flag load once the profile is available
  useEffect(() => {
    if (!detail) return;
    let active = true;
    apiGet<{ items: ReviewItem[] }>(`/api/v1/doctors/${slug}/reviews`)
      .then((d) => {
        if (active) setReviews(d.items);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    apiGet<{ flags: Record<string, boolean> }>("/api/v2/meta")
      .then((d) => {
        if (active) setTelehealthOn(Boolean(d.flags?.telehealth));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [detail, slug]);

  const retry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  if (loading && !detail) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={5} />
        <LoadingCard rows={3} />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("doctor.notFound")} />
        <ErrorState message={error} onRetry={retry} />
      </div>
    );
  }

  if (!detail) return null;

  const fee = detail.feeStructure;

  return (
    <div className="space-y-4 pb-2">
      <PageHeader title={detail.name} onBack={popPatient} />

      {/* ── header card ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft">
        <div className="flex gap-4">
          <UserAvatar
            name={detail.name}
            photoUrl={detail.photoUrl}
            className="h-16 w-16 sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{detail.name}</h2>
              <VerificationBadge status={detail.verificationStatus} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {detail.specialties.map((s) => (
                <Badge
                  key={s.slug}
                  variant="secondary"
                  className="text-[11px] font-medium"
                >
                  {s.name}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <Stars rating={detail.ratingAvg} count={detail.ratingCount} />
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {detail.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("search.yearsExperience", { years: detail.experienceYears })}
              </span>
            </div>
            {detail.languages.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("doctor.languages")}:
                </span>{" "}
                {detail.languages.map(languageLabel).join(", ")}
              </p>
            ) : null}
            {detail.regNumber ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("doctor.regNumber", { number: detail.regNumber })}
              </p>
            ) : null}
            {detail.supportsVideo ? (
              <Badge
                variant="outline"
                className="mt-2.5 gap-1.5 border-border bg-muted/60 text-muted-foreground"
                title={
                  telehealthOn
                    ? "Video consultations"
                    : "Video consultations are pending regulatory approval"
                }
              >
                <Video className="h-3 w-3" aria-hidden="true" />
                Video consultation — coming soon
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── fees ────────────────────────────────────────────────── */}
      <SectionCard title={t("doctor.fees")}>
        {fee ? (
          <div className="divide-y divide-border/70">
            <InfoRow label={t("doctor.newPatient")}>
              <Money amount={fee.newPatientFee} currency={detail.currency} />
            </InfoRow>
            <InfoRow label={t("doctor.returningPatient")}>
              <Money amount={fee.returningPatientFee} currency={detail.currency} />
            </InfoRow>
            <InfoRow
              label={t("doctor.validity", {
                value: fee.returningValidityValue,
                unit:
                  fee.returningValidityUnit === "DAYS"
                    ? t("doctor.days")
                    : t("doctor.months"),
              })}
            >
              <span className="text-muted-foreground">
                {fee.returningValidityUnit === "DAYS"
                  ? `${fee.returningValidityValue} ${t("doctor.days")}`
                  : `${fee.returningValidityValue} ${t("doctor.months")}`}
              </span>
            </InfoRow>
            {fee.followUpEnabled ? (
              <InfoRow label={t("type.FOLLOW_UP")}>
                <Money amount={fee.followUpFee} currency={detail.currency} />
              </InfoRow>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            <InfoRow label={t("booking.consultationFee")}>
              <Money amount={detail.consultationFee} currency={detail.currency} />
            </InfoRow>
          </div>
        )}
      </SectionCard>

      {/* ── about ───────────────────────────────────────────────── */}
      {detail.bio ? (
        <SectionCard title={t("doctor.about")}>
          <p className="text-sm leading-relaxed text-foreground/90">{detail.bio}</p>
        </SectionCard>
      ) : null}

      {/* ── chambers ────────────────────────────────────────────── */}
      <SectionCard title={t("doctor.chambers")}>
        {detail.chambers.length > 0 ? (
          <ul className="space-y-3">
            {detail.chambers.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-background p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[c.address, c.area, c.city].filter(Boolean).join(", ")}
                    </p>
                    {c.phone ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.phone}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : detail.chamberAddress ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Chamber</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {detail.chamberAddress}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState title={t("common.notAvailable")} />
        )}
      </SectionCard>

      {/* ── weekly schedule ─────────────────────────────────────── */}
      <SectionCard title={t("doctor.schedule")}>
        {detail.weeklySchedule.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Schedule not published yet — check available dates when booking.
          </p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {[...detail.weeklySchedule]
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
              .map((rule, i) => (
                <li
                  key={`${rule.dayOfWeek}-${rule.startMinute}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {DAY_NAMES[rule.dayOfWeek]}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {minutesLabel(rule.startMinute)} – {minutesLabel(rule.endMinute)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      {/* ── reviews ─────────────────────────────────────────────── */}
      <SectionCard
        title={t("doctor.reviewsTitle")}
        action={
          detail.ratingAvg !== null ? (
            <Stars rating={detail.ratingAvg} count={detail.ratingCount} />
          ) : undefined
        }
      >
        {reviews === null ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No reviews yet — be the first after a completed visit.
          </p>
        ) : (
          <ul className="max-h-96 space-y-3 overflow-y-auto app-scroll pr-1">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-background p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {r.patientName}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(r.createdAt)}
                  </span>
                </div>
                <Stars rating={r.rating} className="mt-1" />
                {r.comment ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                    {r.comment}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Separator className="my-1" />

      {/* ── booking CTA: sticky bottom on mobile, inline on desktop ── */}
      <div className="sticky bottom-24 md:bottom-4 z-30 -mx-4 px-4">
        <div className="rounded-2xl border border-border bg-card/95 p-3 shadow-soft-lg backdrop-blur md:static md:shadow-soft md:backdrop-blur-none">
          <Button
            className="h-12 w-full text-base"
            size="lg"
            onClick={() => pushPatient({ name: "booking", slug: detail.slug })}
          >
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
            {t("doctor.bookAppointment")}
            {detail.requiresApproval ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                <Clock className="h-3 w-3" aria-hidden="true" />
                approval needed
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                instant
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
