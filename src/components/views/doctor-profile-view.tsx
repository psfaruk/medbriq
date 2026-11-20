"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CircleAlert,
  Clock,
  FileX2,
  Languages,
  MapPin,
  ShieldCheck,
  Star,
  Users,
  Video,
  Zap,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationBadge } from "@/components/doctors/verification-badge";
import { formatFee, getInitials } from "@/components/doctors/doctor-card";
import { useAppStore } from "@/lib/store";
import { LANGUAGES } from "@/lib/constants";
import { DAY_SHORT, formatDhaka, minutesToLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  ApiResult,
  DoctorDetail,
  ReviewItem,
} from "@/lib/types";

/** GET /api/v1/doctors/[slug]/reviews payload. */
type ReviewsPayload = {
  items: ReviewItem[];
  ratingAvg: number | null;
  ratingCount: number;
};

type DetailStatus = "loading" | "ready" | "notfound" | "error";
type ReviewsStatus = "loading" | "ready" | "error";

/** Error carrying the HTTP status / API code so 404s can be handled gently. */
class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

/** Fetch a Medbriq API endpoint and unwrap the { ok, data } envelope. */
async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!res.ok || !json || !json.ok) {
    throw new ApiRequestError(
      json && json.ok === false
        ? json.error.message
        : `Request failed with status ${res.status}.`,
      res.status,
      json && json.ok === false ? json.error.code : "UNKNOWN"
    );
  }
  return json.data;
}

/** Intl options that render only the Dhaka-local calendar date. */
const DATE_ONLY: Intl.DateTimeFormatOptions = {
  weekday: undefined,
  hour: undefined,
  minute: undefined,
  month: "short",
  day: "numeric",
  year: "numeric",
};

type ScheduleRule = DoctorDetail["weeklySchedule"][number];

export default function DoctorProfileView({ slug }: { slug: string }) {
  const navigate = useAppStore((state) => state.navigate);
  const { toast } = useToast();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<DetailStatus>("loading");
  const [detailError, setDetailError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [reviewsStatus, setReviewsStatus] = useState<ReviewsStatus>("loading");

  const [retryKey, setRetryKey] = useState(0);

  // Load the profile and its reviews in parallel.
  useEffect(() => {
    let active = true;
    let doctorLoaded = false;

    // Reset state asynchronously — setState must not run synchronously
    // inside an effect body (react-hooks/set-state-in-effect).
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setDetailStatus("loading");
      setDetailError(null);
      setReviewsStatus("loading");
      setDoctor(null);
      setReviews([]);
      setRatingAvg(null);
      setRatingCount(0);
    })();

    fetchApi<DoctorDetail>(`/api/v1/doctors/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return;
        doctorLoaded = true;
        setDoctor(data);
        setDetailStatus("ready");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (
          err instanceof ApiRequestError &&
          (err.status === 404 || err.code === "NOT_FOUND")
        ) {
          setDetailStatus("notfound");
          return;
        }
        const message =
          err instanceof Error ? err.message : "Please try again in a moment.";
        setDetailError(message);
        setDetailStatus("error");
        toast({
          variant: "destructive",
          title: "Could not load this profile",
          description: message,
        });
      });

    fetchApi<ReviewsPayload>(
      `/api/v1/doctors/${encodeURIComponent(slug)}/reviews`
    )
      .then((data) => {
        if (!active) return;
        setReviews(data.items);
        setRatingAvg(data.ratingAvg);
        setRatingCount(data.ratingCount);
        setReviewsStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setReviewsStatus("error");
        // Only surface a toast when the profile itself loaded fine.
        if (doctorLoaded) {
          toast({
            variant: "destructive",
            title: "Could not load reviews",
            description: "Please try again in a moment.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [slug, retryKey, toast]);

  // Group active weekly rules by day of week (0 = Sunday).
  const rulesByDay = useMemo<ScheduleRule[][]>(() => {
    const byDay: ScheduleRule[][] = Array.from({ length: 7 }, () => []);
    if (doctor) {
      for (const rule of doctor.weeklySchedule) {
        byDay[rule.dayOfWeek]?.push(rule);
      }
    }
    return byDay;
  }, [doctor]);

  if (detailStatus === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-4 h-8 w-36" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid grid-cols-3 gap-4 p-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-56" />
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-5 w-full max-w-md" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-11 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 p-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (detailStatus === "notfound") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <FileX2
              className="h-12 w-12 text-muted-foreground"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold">Doctor not found</h1>
            <p className="text-sm text-muted-foreground">
              The profile may have been removed or is under review.
            </p>
            <Button
              variant="outline"
              className="mt-2 gap-2"
              onClick={() => navigate({ name: "search" })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (detailStatus === "error" || !doctor) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <CircleAlert
              className="h-12 w-12 text-destructive"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold">
              Could not load this profile
            </h1>
            <p className="text-sm text-muted-foreground">
              {detailError ?? "Something went wrong. Please try again."}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => setRetryKey((key) => key + 1)}>
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate({ name: "search" })}
              >
                Back to search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVerified = doctor.verificationStatus === "VERIFIED";
  const languageLabels = doctor.languages
    .map((code) => LANGUAGES[code] ?? code)
    .filter(Boolean);
  const hospitalLine = doctor.hospitalName ?? "Independent practice";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1.5 text-muted-foreground"
        onClick={() => navigate({ name: "search" })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to search
      </Button>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ------------------------- Left column ------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* 1. Profile header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-20 w-20 shrink-0 border">
                  {doctor.photoUrl ? (
                    <AvatarImage
                      src={doctor.photoUrl}
                      alt={`Photo of ${doctor.name}`}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                    {getInitials(doctor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {doctor.name}
                    </h1>
                    <VerificationBadge status={doctor.verificationStatus} />
                  </div>
                  {doctor.specialties.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {doctor.specialties.map((specialty) => (
                        <Badge
                          key={specialty.slug}
                          variant="secondary"
                        >
                          {specialty.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <MapPin
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {doctor.city}
                    </p>
                    <p className="flex items-center gap-2">
                      <Briefcase
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {doctor.experienceYears}+ years experience
                    </p>
                    <p className="flex items-center gap-2">
                      <Languages
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      {languageLabels.length > 0
                        ? languageLabels.join(" · ")
                        : "—"}
                    </p>
                    <p className="flex items-start gap-2">
                      <Building2
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        {hospitalLine}
                        {doctor.chamberAddress ? (
                          <span className="mt-0.5 block text-xs">
                            {doctor.chamberAddress}
                          </span>
                        ) : null}
                      </span>
                    </p>
                    {doctor.supportsVideo ? (
                      <p className="flex items-center gap-2 font-medium text-success">
                        <Video
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        Video consultation available
                      </p>
                    ) : null}
                    <p className="flex items-center gap-2">
                      {doctor.requiresApproval ? (
                        <>
                          <Users
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          Requires doctor approval
                        </>
                      ) : (
                        <>
                          <Zap
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          Instant booking
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Non-verified notice (mobile inline; desktop shows it in the
              booking card). */}
          {!isVerified ? (
            <Alert className="border-warning/40 bg-warning/10 lg:hidden">
              <Clock className="h-4 w-4 text-warning" />
              <AlertTitle>Verification pending</AlertTitle>
              <AlertDescription>
                This profile is under admin review. Booking opens after
                verification.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* 2. Fees */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 divide-x text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Consultation</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {formatFee(doctor.consultationFee)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Follow-up</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatFee(doctor.followUpFee)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Video</p>
                  <p className="mt-1 text-lg font-bold">
                    {doctor.supportsVideo && doctor.videoConsultFee !== null
                      ? formatFee(doctor.videoConsultFee)
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. About */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">About</h2>
              {doctor.bio ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {doctor.bio}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No bio provided yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 4. Weekly chamber schedule */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">
                Weekly chamber schedule
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All times are Asia/Dhaka · 30-minute slots
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {DAY_SHORT.map((day, index) => {
                  const rules = rulesByDay[index] ?? [];
                  return (
                    <li
                      key={day}
                      className={cn(
                        "flex items-baseline gap-3",
                        rules.length === 0 && "text-muted-foreground"
                      )}
                    >
                      <span className="w-14 shrink-0 font-medium">{day}</span>
                      <span>
                        {rules.length === 0
                          ? "—"
                          : rules
                              .map(
                                (rule) =>
                                  `${minutesToLabel(rule.startMinute)} – ${minutesToLabel(rule.endMinute)}`
                              )
                              .join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* 5. Reviews */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Patient reviews</h2>
                {reviewsStatus === "ready" && ratingAvg !== null ? (
                  <p className="flex items-center gap-1.5 text-sm">
                    <Star
                      className="h-5 w-5 fill-warning text-warning"
                      aria-hidden="true"
                    />
                    <span className="font-semibold">{ratingAvg}</span>
                    <span className="text-muted-foreground">
                      ({ratingCount})
                    </span>
                  </p>
                ) : null}
              </div>

              {reviewsStatus === "loading" ? (
                <div className="mt-5 space-y-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ))}
                </div>
              ) : reviewsStatus === "error" ? (
                <div className="mt-5 flex flex-col items-start gap-2">
                  <p className="text-sm text-muted-foreground">
                    Could not load reviews right now.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRetryKey((key) => key + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : reviews.length > 0 ? (
                <ul className="medbriq-scroll mt-4 max-h-96 divide-y overflow-y-auto">
                  {reviews.map((review) => (
                    <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                      <div
                        className="flex items-center gap-0.5"
                        role="img"
                        aria-label={`Rated ${review.rating} out of 5`}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-4",
                              star <= review.rating
                                ? "fill-warning text-warning"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-sm leading-relaxed">
                          {review.comment}
                        </p>
                      ) : null}
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium">
                          {review.patientName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDhaka(new Date(review.createdAt), DATE_ONLY)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No reviews yet — reviews appear after completed appointments.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Mobile sticky booking bar. Placed at the end of the column so
              `sticky bottom-4` keeps it pinned to the viewport bottom while
              the long profile content scrolls. */}
          {isVerified ? (
            <div className="sticky bottom-4 z-10 mx-4 flex items-center justify-between gap-3 rounded-full bg-primary p-2 pr-5 text-primary-foreground shadow-lg lg:hidden">
              <div className="min-w-0 pl-2">
                <p className="text-base font-bold leading-tight">
                  {formatFee(doctor.consultationFee)}
                </p>
                <p className="text-xs text-primary-foreground/85">
                  per consultation
                </p>
              </div>
              <Button
                variant="secondary"
                className="shrink-0 gap-2 rounded-full"
                onClick={() => navigate({ name: "booking", slug: doctor.slug })}
                aria-label={`Book an appointment with ${doctor.name}`}
              >
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Book
              </Button>
            </div>
          ) : null}
        </div>

        {/* ------------------------- Right column ------------------------ */}
        <div className="flex flex-col gap-6 self-start lg:sticky lg:top-20">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">Book an appointment</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Next available:{" "}
                {doctor.nextAvailableLabel ?? "See full schedule"}
              </p>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-bold text-primary">
                  {formatFee(doctor.consultationFee)}
                </span>
                <span className="text-xs text-muted-foreground">
                  per consultation
                </span>
              </p>

              {isVerified ? (
                <Button
                  size="lg"
                  className="mt-5 w-full gap-2"
                  onClick={() =>
                    navigate({ name: "booking", slug: doctor.slug })
                  }
                >
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  Book Appointment
                </Button>
              ) : (
                <Alert className="mt-5 border-warning/40 bg-warning/10">
                  <Clock className="h-4 w-4 text-warning" />
                  <AlertTitle>Verification pending</AlertTitle>
                  <AlertDescription>
                    This profile is under admin review. Booking opens after
                    verification.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-success"
                aria-hidden="true"
              />
              <p className="text-xs text-muted-foreground">
                Medbriq reviews doctor registration details before granting
                the Verified badge. Demo environment — sample data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
