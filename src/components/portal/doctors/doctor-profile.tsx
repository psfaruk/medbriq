"use client";

/**
 * Public doctor profile (spec §4): verified credentials, chambers, fees,
 * weekly schedule, reviews. The Book Appointment button is the auth gate
 * (spec §12): guests save a booking intent and are taken to sign-in; the
 * flow resumes after login. Availability/price are always revalidated
 * server-side during the actual booking (existing booking flow).
 */

import { useEffect } from "react";
import {
  MapPin,
  Phone,
  Clock,
  BadgeCheck,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { DoctorDetail, ReviewItem } from "@/lib/types";
import { useAppStore } from "@/lib/app-state";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import {
  useT,
  Money,
  Stars,
  UserAvatar,
  VerificationBadge,
  EmptyState,
  ErrorState,
  DAY_LABELS,
} from "@/components/app/shared/ui-kit";
import {
  Breadcrumbs,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";

function minuteLabel(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

export default function DoctorProfileView({ slug }: { slug: string }) {
  const { t } = useT();
  const { toast } = useToast();
  useTrackPageView("doctor");
  const user = useAppStore((s) => s.user);
  const setPortalView = useAppStore((s) => s.setPortalView);
  const setPendingBooking = useAppStore((s) => s.setPendingBooking);
  const setPortalMode = useAppStore((s) => s.setPortalMode);
  const resetPatient = useAppStore((s) => s.resetPatient);

  const { data, loading, error, reload } = usePortalData<DoctorDetail>(
    `/api/v1/doctors/${encodeURIComponent(slug)}`
  );
  const reviews = usePortalData<{ items: ReviewItem[]; summary: { avg: number; count: number } }>(
    `/api/v1/doctors/${encodeURIComponent(slug)}/reviews`
  );

  useEffect(() => {
    track("profile_view_doctor");
  }, [slug]);

  /**
   * Auth gate for booking (spec §12).
   * - Logged-in patient → jump straight into the booking flow.
   * - Guest → save the intent, go to sign-in; the app resumes the booking
   *   after successful login (see app.tsx).
   * - Doctor/hospital/admin session → honest explanation, no silent break.
   */
  function startBooking() {
    if (!data) return;
    track("booking_start");
    if (!user) {
      setPendingBooking({
        doctorSlug: data.slug,
        doctorName: data.name,
        savedAt: new Date().toISOString(),
      });
      setPortalView({ name: "auth", mode: "login" }, { push: true });
      return;
    }
    if (user.role === "PATIENT") {
      setPortalMode(false);
      resetPatient({ name: "booking", slug: data.slug });
      return;
    }
    toast({
      title: "Signed in as " + user.role.toLowerCase(),
      description:
        "Booking is a patient feature. Use a patient account to book an appointment.",
    });
  }

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.nav.findDoctors"), view: { name: "doctors" } },
          { label: data?.name ?? "…" },
        ]}
      />

      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && !data && (
        <EmptyState
          icon={<BadgeCheck className="h-6 w-6" />}
          title={t("portal.doctor.notFound")}
          hint="The doctor may have been removed or the link is incorrect."
          action={
            <PortalLink view={{ name: "doctors" }}>
              <Button size="sm" variant="outline">
                {t("portal.cta.viewAllDoctors")}
              </Button>
            </PortalLink>
          }
        />
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            {/* Header card */}
            <Card className="shadow-soft">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <UserAvatar
                    name={data.name}
                    photoUrl={data.photoUrl}
                    className="h-20 w-20 text-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                        {data.name}
                      </h1>
                      <VerificationBadge status={data.verificationStatus} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#0f8f87]">
                      {data.specialties.map((s) => s.name).join(" · ")}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {data.city}
                      </span>
                      <span>{t("portal.doctor.experienceYears", { years: data.experienceYears })}</span>
                      {data.regNumber && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {t("portal.doctor.regNumber")}: {data.regNumber}
                        </span>
                      )}
                    </p>
                    {data.ratingCount > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm">
                        <Stars rating={data.ratingAvg} />
                        <span className="font-semibold text-foreground">
                          {data.ratingAvg?.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({data.ratingCount} {t("portal.doctor.reviews").toLowerCase()})
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {data.bio && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        {t("portal.doctor.about")}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {data.bio}
                      </p>
                    </div>
                  </>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("portal.doctor.languages")}:
                  </span>
                  {data.languages.map((code) => (
                    <span
                      key={code}
                      className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary"
                    >
                      {code === "bn" ? "বাংলা" : code === "en" ? "English" : code.toUpperCase()}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chambers */}
            {data.chambers.length > 0 && (
              <Card className="mt-5 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("portal.doctor.chambers")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.chambers.map((chamber) => (
                    <div
                      key={chamber.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <p className="text-sm font-bold text-foreground">{chamber.name}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {[chamber.address, chamber.area, chamber.city]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {chamber.phone && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {chamber.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Weekly schedule */}
            {data.weeklySchedule.length > 0 && (
              <Card className="mt-5 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
                    {t("portal.doctor.weeklySchedule")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.weeklySchedule.map((rule, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                      >
                        <span className="font-semibold text-foreground">
                          {DAY_LABELS[rule.dayOfWeek]}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {minuteLabel(rule.startMinute)} – {minuteLabel(rule.endMinute)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card className="mt-5 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("portal.doctor.reviews")}</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.loading && !reviews.data && <Skeleton className="h-16 rounded-xl" />}
                {reviews.data && reviews.data.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("portal.doctor.noReviews")}</p>
                )}
                {reviews.data && reviews.data.items.length > 0 && (
                  <ul className="space-y-4">
                    {reviews.data.items.map((r) => (
                      <li key={r.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{r.patientName}</p>
                          <Stars rating={r.rating} />
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {r.comment}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Reviews are written by patients after completed visits (demo data).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sticky booking sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="shadow-soft">
              <CardContent className="p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Consultation fees
                </h2>
                <div className="mt-3 space-y-2.5">
                  <FeeRow
                    label={t("portal.doctor.feeNew")}
                    amount={data.feeStructure?.newPatientFee ?? data.consultationFee}
                    currency={data.currency}
                  />
                  <FeeRow
                    label={t("portal.doctor.feeReturning")}
                    amount={
                      data.feeStructure?.returningPatientFee ?? data.followUpFee
                    }
                    currency={data.currency}
                  />
                  {data.feeStructure?.followUpEnabled && (
                    <FeeRow
                      label={t("portal.doctor.feeFollowUp")}
                      amount={data.feeStructure.followUpFee}
                      currency={data.currency}
                    />
                  )}
                </div>
                <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
                  Your exact fee is calculated automatically at booking time (new,
                  returning or follow-up) and confirmed before you pay — always
                  revalidated on the server.
                </p>

                <Button
                  size="lg"
                  className="mt-4 w-full gap-1.5 text-base font-bold"
                  onClick={startBooking}
                >
                  {t("portal.cta.bookAppointment")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                {!user && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Free account required to book — takes a minute
                  </p>
                )}

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {data.nextAvailableLabel
                    ? `${t("portal.doctor.nextAvailable")}: ${data.nextAvailableLabel}`
                    : t("portal.doctor.noSlots")}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </main>
  );
}

function FeeRow({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">
        <Money amount={amount} currency={currency} />
      </span>
    </div>
  );
}
