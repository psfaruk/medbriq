import { z } from "zod";
import { getStore } from "@/lib/data";
import { fail, handleRouteError, ok } from "@/lib/api";
import type { ReviewItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors/[slug]/reviews — public reviews for a doctor.
 * Newest first, limit 50. Patient emails are never exposed (name only).
 */

const HIDDEN_STATUSES = ["REJECTED", "MORE_INFO"];

const slugSchema = z.string().trim().min(1).max(120);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsedSlug = slugSchema.safeParse(slug);
    if (!parsedSlug.success) {
      return fail("Doctor not found", 404, "NOT_FOUND");
    }

    const store = getStore();
    const doctor = await store.getDoctorIdAndStatusBySlug(parsedSlug.data);
    if (!doctor || HIDDEN_STATUSES.includes(doctor.verificationStatus)) {
      return fail("Doctor not found", 404, "NOT_FOUND");
    }

    const reviews = await store.listReviewsByDoctor(doctor.id);

    const items: ReviewItem[] = reviews.slice(0, 50).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      patientName: review.patientName,
    }));

    const ratingCount = reviews.length;
    const ratingAvg =
      ratingCount > 0
        ? Math.round(
            (reviews.reduce((sum, review) => sum + review.rating, 0) /
              ratingCount) *
              10
          ) / 10
        : null;

    return ok(
      {
        items,
        ratingAvg,
        ratingCount,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
