import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { fail, handleRouteError, ok } from "@/lib/api";
import { cached, invalidateMemoryCache } from "@/lib/cache";
import { getCurrentUser } from "@/lib/auth";
import { NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import { notifyUser } from "@/app/api/v1/_lib/booking";
import type { ReviewItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors/[slug]/reviews — public reviews for a doctor.
 * Newest first, limit 50. Patient emails are never exposed (name only).
 *
 * POST /api/v1/doctors/[slug]/reviews — patient-only review creation.
 * Eligibility: at least one COMPLETED appointment with this doctor;
 * one review per (doctor, patient). The doctor gets an in-app
 * notification (rating only — never the comment text).
 */

const HIDDEN_STATUSES = ["REJECTED", "MORE_INFO"];

const slugSchema = z.string().trim().min(1).max(120);

const createReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number.")
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  comment: z
    .string()
    .trim()
    .max(1000, "Comment must be at most 1000 characters.")
    .optional(),
});

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

    // Public, per-doctor — safe to cache briefly. POST below invalidates.
    const data = await cached(`v1:reviews:${slug}`, 30_000, async () => {
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

    return {
      items,
      ratingAvg,
      ratingCount,
    };
    });

    return ok(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsedSlug = slugSchema.safeParse(slug);
    if (!parsedSlug.success) {
      return fail("Doctor not found", 404, "DOCTOR_NOT_FOUND");
    }

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.PATIENT) {
      return fail("Only patients can review doctors.", 403, "FORBIDDEN");
    }

    const raw: unknown = await req.json().catch(() => null);
    const parsed = createReviewSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid review.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const store = getStore();
    // Full record (not just the id lookup) because the notification needs
    // the owning doctor's userId.
    const doctor = await store.getDoctorBySlug(parsedSlug.data);
    if (!doctor || HIDDEN_STATUSES.includes(doctor.verificationStatus)) {
      return fail("Doctor not found", 404, "DOCTOR_NOT_FOUND");
    }

    // Eligibility: the patient must have had a completed appointment with
    // this exact doctor.
    const appointments = await store.listAppointmentsByPatient(user.id);
    const eligible = appointments.some(
      (appt) => appt.doctorId === doctor.id && appt.status === "COMPLETED"
    );
    if (!eligible) {
      return fail(
        "You can review a doctor after a completed appointment.",
        403,
        "NOT_ELIGIBLE"
      );
    }

    // One review per (doctor, patient) — the DB also enforces uniqueness.
    const existing = await store.findReviewByDoctorAndPatient(
      doctor.id,
      user.id
    );
    if (existing) {
      return fail(
        "You have already reviewed this doctor.",
        409,
        "ALREADY_REVIEWED"
      );
    }

    const review = await store.createReview({
      doctorId: doctor.id,
      patientId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    });

    await store.createAuditLog({
      actorId: user.id,
      action: "REVIEW_CREATED",
      entity: "Review",
      entityId: review.id,
      meta: JSON.stringify({ doctorId: doctor.id, rating: review.rating }),
    });

    // Rating only — the comment text never leaves the review surface.
    await notifyUser(
      doctor.userId,
      NOTIFICATION_TYPES.REVIEW_RECEIVED,
      "New review received",
      `${user.name} rated you ${review.rating}/5.`,
      { doctorSlug: doctor.slug, reviewId: review.id }
    );

    // Ratings feed the public doctor list/detail — drop cached copies.
    invalidateMemoryCache("v1:reviews");
    invalidateMemoryCache("v1:doctor");
    invalidateMemoryCache("v1:doctors");

    return ok(
      {
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          patientName: review.patientName,
        },
      },
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
