import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { fail, handleRouteError, ok } from "@/lib/api";
import { cached, publicCacheHeaders } from "@/lib/cache";
import { CURRENCY, type VerificationStatus } from "@/lib/constants";
import { getSlotsForDate } from "@/lib/slots";
import { addDays, dhakaDateString, formatDateLabel } from "@/lib/time";
import type { DoctorCard } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors — public doctor directory.
 *
 * PERF NOTES (deliberate MVP tradeoffs, documented for the scale-up path):
 * - The directory is small (dozens of doctors), so matching profiles are
 *   fetched with their relations in one call and the remaining filtering,
 *   rating aggregation, sorting and pagination are computed in memory.
 *   At scale this endpoint needs indexed queries per filter (SQL) or
 *   composite indexes + denormalized counters (Firestore).
 * - nextAvailableLabel is an N+1 pattern per page item (see helper below).
 */

/** Only these verification statuses are visible in the public directory. */
const PUBLIC_STATUSES = ["VERIFIED", "PENDING"];

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  specialty: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  language: z.string().trim().max(10).optional(),
  video: z.enum(["true", "false"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
  maxFee: z.coerce.number().min(0).optional(),
  availableToday: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
  sort: z.literal("rating").optional(),
});

/**
 * First Dhaka-local date (today..+13) on which the doctor has a slot that is
 * neither taken nor in the past, labeled "Today" / "Tomorrow" / "Sat, 14 Feb".
 *
 * N+1 cost tradeoff: up to 14 getSlotsForDate calls (2 store calls each) per
 * doctor, computed only for the current page of results. Acceptable for a
 * directory of dozens of doctors; at scale this must move to a precomputed
 * "next available" cache refreshed on booking/cancellation events.
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

export async function GET(request: NextRequest) {
  try {
    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return fail(`Invalid query parameters — ${message}`, 400, "INVALID_QUERY");
    }

    // Whole-response cache (per exact query string): the "next available"
    // N+1 below costs ~14 days × 2 reads per doctor on the page — it must
    // not run on every request. 60s TTL + edge s-maxage keeps this cheap.
    const data = await cached(
      `v1:doctors:${request.nextUrl.search}`,
      60_000,
      async () => {
    const {
      q,
      specialty,
      city,
      language,
      video,
      verified,
      maxFee,
      availableToday,
      page,
      pageSize,
      sort,
    } = parsed.data;

    const wantsVideo = video === "true";
    const wantsVerified = verified === "true";
    const wantsAvailableToday = availableToday === "true";

    // Store-level filters. Relation/case-insensitive text matching (q, city,
    // language) is applied in memory below so behavior does not depend on the
    // database engine's collation rules.
    const rows = await getStore().searchDoctors({
      statuses: wantsVerified ? ["VERIFIED"] : PUBLIC_STATUSES,
      ...(wantsVideo ? { supportsVideo: true } : {}),
      ...(maxFee !== undefined ? { maxFee } : {}),
      ...(specialty ? { specialtySlug: specialty } : {}),
    });

    const qLower = q?.toLowerCase();
    const cityLower = city?.toLowerCase();
    const languageCode = language?.toLowerCase();

    const matched = rows.filter((row) => {
      if (qLower) {
        const haystack = [
          row.name,
          row.hospital?.name ?? "",
          ...row.specialties.map((s) => s.name),
        ];
        if (!haystack.some((value) => value.toLowerCase().includes(qLower))) {
          return false;
        }
      }
      if (cityLower && !row.city.toLowerCase().includes(cityLower)) {
        return false;
      }
      if (languageCode) {
        const codes = (row.languages ?? "")
          .split(",")
          .map((code) => code.trim().toLowerCase());
        if (!codes.includes(languageCode)) return false;
      }
      return true;
    });

    // In-memory rating aggregation (null when there are no reviews).
    const rated = matched.map((row) => {
      const count = row.reviewRatings.length;
      const average =
        count > 0
          ? row.reviewRatings.reduce((sum, rating) => sum + rating, 0) / count
          : null;
      return {
        row,
        ratingAvg:
          average !== null ? Math.round(average * 10) / 10 : null,
        ratingCount: count,
      };
    });

    // availableToday is a post-filter that must run BEFORE pagination: the
    // doctor needs at least one not-taken, not-past slot during today's
    // Dhaka date. (Per-doctor query — N+1 accepted for the MVP, see header.)
    let eligible = rated;
    if (wantsAvailableToday) {
      const todayStr = dhakaDateString();
      const withTodaySlots: typeof rated = [];
      for (const entry of rated) {
        const slots = await getSlotsForDate(entry.row.id, todayStr);
        if (slots.some((slot) => !slot.taken && !slot.past)) {
          withTodaySlots.push(entry);
        }
      }
      eligible = withTodaySlots;
    }

    const byRatingThenExperience = (
      a: (typeof rated)[number],
      b: (typeof rated)[number]
    ) =>
      (b.ratingAvg ?? -1) - (a.ratingAvg ?? -1) ||
      b.row.experienceYears - a.row.experienceYears;

    eligible.sort((a, b) => {
      if (sort === "rating") return byRatingThenExperience(a, b);
      // Default ranking: VERIFIED first, then ratingAvg desc (nulls last),
      // then experienceYears desc.
      const tier = (entry: (typeof rated)[number]) =>
        entry.row.verificationStatus === "VERIFIED" ? 0 : 1;
      return tier(a) - tier(b) || byRatingThenExperience(a, b);
    });

    const total = eligible.length;
    const start = (page - 1) * pageSize;
    const pageEntries = eligible.slice(start, start + pageSize);

    // nextAvailableLabel is computed only for the returned page (not for the
    // whole result set) to keep the N+1 cost bounded.
    const items: DoctorCard[] = await Promise.all(
      pageEntries.map(async (entry) => ({
        id: entry.row.id,
        slug: entry.row.slug,
        name: entry.row.name,
        photoUrl: entry.row.photoUrl,
        city: entry.row.city,
        verificationStatus: entry.row.verificationStatus as VerificationStatus,
        experienceYears: entry.row.experienceYears,
        consultationFee: entry.row.consultationFee,
        currency: CURRENCY.BDT,
        supportsVideo: entry.row.supportsVideo,
        requiresApproval: entry.row.requiresApproval,
        specialties: entry.row.specialties.map((s) => ({
          name: s.name,
          slug: s.slug,
        })),
        hospitalName: entry.row.hospital?.name ?? null,
        languages: (entry.row.languages ?? "")
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean),
        ratingAvg: entry.ratingAvg,
        ratingCount: entry.ratingCount,
        nextAvailableLabel: await computeNextAvailableLabel(entry.row.id),
      }))
    );

    return { items, total, page, pageSize };
      }
    );

    return ok(data, { headers: publicCacheHeaders(60) });
  } catch (err) {
    return handleRouteError(err);
  }
}
