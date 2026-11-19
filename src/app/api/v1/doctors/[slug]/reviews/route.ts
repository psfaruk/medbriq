import { z } from "zod";
import { db } from "@/lib/db";
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

    const doctor = await db.doctorProfile.findUnique({
      where: { slug: parsedSlug.data },
      select: { id: true, verificationStatus: true },
    });
    if (!doctor || HIDDEN_STATUSES.includes(doctor.verificationStatus)) {
      return fail("Doctor not found", 404, "NOT_FOUND");
    }

    const [reviews, aggregate] = await Promise.all([
      db.review.findMany({
        where: { doctorId: doctor.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { patient: { select: { name: true } } },
      }),
      db.review.aggregate({
        where: { doctorId: doctor.id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const items: ReviewItem[] = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      patientName: review.patient.name,
    }));

    return ok(
      {
        items,
        ratingAvg:
          aggregate._avg.rating != null
            ? Math.round(aggregate._avg.rating * 10) / 10
            : null,
        ratingCount: aggregate._count,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
