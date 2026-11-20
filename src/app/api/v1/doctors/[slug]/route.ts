import { z } from "zod";
import { getStore } from "@/lib/data";
import { fail, handleRouteError, ok } from "@/lib/api";
import { CURRENCY, type VerificationStatus } from "@/lib/constants";
import { getSlotsForDate } from "@/lib/slots";
import { addDays, dhakaDateString, formatDateLabel } from "@/lib/time";
import type { DoctorDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors/[slug] — public doctor profile detail.
 * REJECTED / MORE_INFO profiles are hidden from the public API (404).
 */

const HIDDEN_STATUSES = ["REJECTED", "MORE_INFO"];

const slugSchema = z.string().trim().min(1).max(120);

/**
 * First Dhaka-local date (today..+13) with a bookable slot.
 * Same N+1 MVP tradeoff as the list route (see src/app/api/v1/doctors/route.ts):
 * fine for one profile per request; move to a precomputed cache at scale.
 */
async function computeNextAvailableLabel(
  doctorId: string
): Promise<string | null> {
  let dateStr = dhakaDateString();
  for (let offset = 0; offset < 14; offset++) {
    const slots = await getSlotsForDate(doctorId, dateStr);
    if (slots.some((slot) => !slot.taken && !slot.past)) {
      if (offset === 0) return "Today";
      if (offset === 1) return "Tomorrow";
      return formatDateLabel(dateStr);
    }
    dateStr = addDays(dateStr, 1);
  }
  return null;
}

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
    const row = await store.getDoctorBySlug(parsedSlug.data);

    if (!row || HIDDEN_STATUSES.includes(row.verificationStatus)) {
      return fail("Doctor not found", 404, "NOT_FOUND");
    }

    // Active weekly rules, sorted by day then start time (contract order).
    const rules = await store.listAvailabilityRules(row.id);

    const ratingCount = row.reviewRatings.length;
    const ratingAvg =
      ratingCount > 0
        ? Math.round(
            (row.reviewRatings.reduce((sum, rating) => sum + rating, 0) /
              ratingCount) *
              10
          ) / 10
        : null;

    const detail: DoctorDetail = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      photoUrl: row.photoUrl,
      city: row.city,
      verificationStatus: row.verificationStatus as VerificationStatus,
      experienceYears: row.experienceYears,
      consultationFee: row.consultationFee,
      currency: CURRENCY.BDT,
      supportsVideo: row.supportsVideo,
      requiresApproval: row.requiresApproval,
      specialties: row.specialties.map((s) => ({
        name: s.name,
        slug: s.slug,
      })),
      hospitalName: row.hospital?.name ?? null,
      languages: (row.languages ?? "")
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
      ratingAvg,
      ratingCount,
      nextAvailableLabel: await computeNextAvailableLabel(row.id),
      bio: row.bio,
      followUpFee: row.followUpFee,
      videoConsultFee: row.videoConsultFee,
      regNumber: row.regNumber,
      chamberAddress: row.chamberAddress,
      verifiedAt: row.verifiedAt,
      country: row.country,
      hospital: row.hospital
        ? {
            name: row.hospital.name,
            slug: row.hospital.slug,
            city: row.hospital.city,
            address: row.hospital.address,
          }
        : null,
      weeklySchedule: rules
        .filter((rule) => rule.isActive)
        .map((rule) => ({
          dayOfWeek: rule.dayOfWeek,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
        })),
    };

    return ok(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err);
  }
}
