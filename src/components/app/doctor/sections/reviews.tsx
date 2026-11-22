"use client";

/**
 * Reviews — patient reviews of this doctor (public endpoint), with the
 * rating summary from the dashboard stats.
 */

import { useCallback, useEffect, useState } from "react";
import { MessageSquareQuote, Star } from "lucide-react";
import {
  DemoNotice,
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  SectionCard,
  UserAvatar,
  fmtDateLong,
} from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import { useAppStore } from "@/lib/app-state";
import type { ReviewItem } from "@/lib/types";
import { useDoctorDashboard } from "../context";
import { errMessage } from "../helpers";

type ReviewsData = {
  items: ReviewItem[];
  ratingAvg: number | null;
  ratingCount: number;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </span>
  );
}

export default function ReviewsSection() {
  const { user } = useAppStore();
  const { data: dashboard } = useDoctorDashboard();
  const slug = user?.doctorSlug;

  const [data, setData] = useState<ReviewsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    apiGet<ReviewsData>(`/api/v1/doctors/${slug}/reviews`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(errMessage(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, tick]);

  const ratingAvg = dashboard?.stats.ratingAvg ?? data?.ratingAvg ?? null;
  const ratingCount =
    dashboard?.stats.ratingCount ?? data?.ratingCount ?? 0;

  if (!slug) {
    return (
      <ErrorState message="Doctor profile not linked to this account." />
    );
  }

  const distribution = (() => {
    if (!data) return [];
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: data.items.filter((r) => r.rating === star).length,
    }));
    return buckets;
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient reviews"
        subtitle="Patients can review you after a completed consultation. Reviews are public on your profile."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Rating summary" className="lg:col-span-1">
          <div className="flex flex-col items-center py-2">
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-5xl">
              {ratingAvg != null ? ratingAvg.toFixed(1) : "—"}
            </p>
            {ratingAvg != null ? (
              <span className="mt-2">
                <Stars rating={Math.round(ratingAvg)} />
              </span>
            ) : null}
            <p className="mt-1.5 text-xs text-muted-foreground">
              {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </p>
          </div>
          {distribution.length > 0 && ratingCount > 0 ? (
            <ul className="mt-2 space-y-1.5 border-t border-border/60 pt-3">
              {distribution.map(({ star, count }) => (
                <li key={star} className="flex items-center gap-2">
                  <span className="w-8 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                    {star}★
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.round((count / ratingCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>

        <div className="lg:col-span-2">
          {loading && !data ? (
            <LoadingCard rows={3} />
          ) : error && !data ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={<MessageSquareQuote className="h-6 w-6" />}
              title="No reviews yet"
              hint="Reviews appear here after patients complete a consultation with you and leave feedback."
            />
          ) : (
            <ul className="space-y-3">
              {data.items.map((review) => (
                <li key={review.id}>
                  <SectionCard>
                    <div className="flex items-start gap-3">
                      <UserAvatar name={review.patientName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-foreground">
                            {review.patientName}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {fmtDateLong(review.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Stars rating={review.rating} />
                        </div>
                        {review.comment ? (
                          <p className="mt-2 text-sm leading-relaxed text-foreground">
                            {review.comment}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </SectionCard>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DemoNotice>
        <strong className="text-foreground">Verified reviews.</strong> Only
        patients with a completed visit can leave a review — ratings reflect
        real consultation experiences.
      </DemoNotice>
    </div>
  );
}
