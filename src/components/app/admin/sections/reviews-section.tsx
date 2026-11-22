"use client";

import { useCallback, useState } from "react";
import { Star, Trash2, ArrowRight, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet } from "@/lib/api-client";
import type { ModerationReviewItem } from "@/lib/types";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  Stars,
  fmtDate,
} from "@/components/app/shared/ui-kit";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Reviews — moderation queue for patient reviews across all doctors.
 *
 * The moderation API (src/app/api/v1/admin/reviews/[id]) supports exactly one
 * action: DELETE. There is no hide/approve endpoint, so this section exposes
 * removal only, with an explicit confirmation — matching the API honestly.
 */
export default function ReviewsSection() {
  const { toast } = useToast();
  const [target, setTarget] = useState<ModerationReviewItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loader = useCallback(
    () => apiGet<{ items: ModerationReviewItem[] }>("/api/v1/admin/reviews"),
    []
  );
  const { data, error, loading, reload } = useAdminData(loader);

  const items = data?.items ?? [];

  const submitDelete = async (review: ModerationReviewItem) => {
    setBusy(true);
    try {
      await apiDelete(`/api/v1/admin/reviews/${review.id}`);
      toast({
        title: "Review removed",
        description: `Rating by ${review.patientName} for ${review.doctorName} is gone. Audit-logged.`,
      });
      setTarget(null);
      reload();
    } catch (err) {
      toast({
        title: "Could not remove the review",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Review moderation"
        subtitle="The 100 most recent patient reviews across every doctor. Flagged or abusive content can be removed."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Star className="h-6 w-6" />}
          title="No reviews to moderate"
          hint="Patient reviews will appear here as they are submitted."
        />
      ) : (
        <SectionCard
          title={`Recent reviews (${items.length})`}
          contentClassName="p-4 sm:p-5"
        >
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((r) => (
              <li
                key={r.id}
                className="flex flex-col rounded-2xl border border-border bg-background/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Stars rating={r.rating} />
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {fmtDate(r.createdAt)}
                  </span>
                </div>
                {r.comment ? (
                  <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-foreground">
                    {r.comment}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    Rating only, no comment.
                  </p>
                )}
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {r.patientName}
                  </span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{r.doctorName}</span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5 self-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => setTarget(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove review
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            The moderation API supports removal only (no hide/restore). Deletion
            is permanent, recalculates the doctor&apos;s rating, and is written
            to the audit trail.
          </p>
        </SectionCard>
      )}

      {/* ── Delete confirmation ─────────────────────────────────── */}
      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove this review by {target?.patientName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target ? (
                <>
                  {target.rating}-star review of {target.doctorName}
                  {target.comment ? ` — “${target.comment}”` : " (rating only)"}
                  . It will be permanently deleted from the doctor&apos;s public
                  profile and the average rating recomputed. This action is
                  audit-logged.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep review</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                if (!target) return;
                e.preventDefault();
                void submitDelete(target);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {busy ? "Removing…" : "Remove review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
