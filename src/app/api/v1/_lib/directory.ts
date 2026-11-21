import { z } from "zod";
import { getStore } from "@/lib/data";
import { cached } from "@/lib/cache";
import { CURRENCY, type VerificationStatus } from "@/lib/constants";
import { districtsOf } from "@/lib/geo";
import {
  BLOCKING_STATUSES,
  buildSlotsForDate,
  type SlotRule,
} from "@/lib/slots";
import {
  addDays,
  dhakaDateString,
  dhakaDayOfWeek,
  dhakaToUtc,
  formatDateLabel,
} from "@/lib/time";
import type { DoctorCard } from "@/lib/types";

/**
 * Public doctor-directory computation, shared by:
 *   - GET /api/v1/doctors          (arbitrary search/filter queries)
 *   - GET /api/v1/bootstrap        (fixed "home" query, see below)
 *
 * Sharing this module means both endpoints use the SAME `cached()` key per
 * query string, so a bootstrap hit warms the directory cache and vice versa.
 *
 * PERF NOTES (deliberate MVP tradeoffs, documented for the scale-up path):
 * - The directory is small (dozens of doctors), so matching profiles are
 *   fetched with their relations in one call and the remaining filtering,
 *   rating aggregation, sorting and pagination are computed in memory.
 *   At scale this endpoint needs indexed queries per filter (SQL) or
 *   composite indexes + denormalized counters (Firestore).
 * - Availability (nextAvailableLabel + availableToday) is computed from a
 *   BATCHED context: 2 parallel indexed reads per doctor (rules + blocking
 *   appointments in the 14-day window), then pure in-memory slot math.
 */

/** Only these verification statuses are visible in the public directory. */
export const PUBLIC_STATUSES = ["VERIFIED", "PENDING"];

/** How many Dhaka-local days ahead the "next available" label scans. */
const NEXT_AVAILABLE_WINDOW_DAYS = 14;

export type DoctorsPage = {
  items: DoctorCard[];
  total: number;
  page: number;
  pageSize: number;
};

/** The exact query the patient home screen uses for its featured strip. */
export const HOME_DOCTORS_QUERY = "sort=rating&pageSize=6&verified=true";

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  specialty: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  /** Nationwide geo filters (Bangladesh administrative hierarchy). */
  division: z.string().trim().max(40).optional(),
  district: z.string().trim().max(60).optional(),
  upazila: z.string().trim().max(60).optional(),
  language: z.string().trim().max(10).optional(),
  video: z.enum(["true", "false"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
  maxFee: z.coerce.number().min(0).optional(),
  availableToday: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
  sort: z.literal("rating").optional(),
});

/** Thrown for malformed directory query strings (route maps it to HTTP 400). */
export class DoctorsQueryError extends Error {}

export function parseDoctorsQuery(search: string) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URLSearchParams(search).entries())
  );
  if (!parsed.success) {
    throw new DoctorsQueryError(
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")
    );
  }
  return parsed.data;
}

// ───────────────────────── Batched availability ─────────────────────────

/**
 * Availability context for a set of doctors.
 *
 * PERF: this replaces the old per-doctor × per-day N+1 (up to 14 days × 2
 * Firestore reads per doctor — 300+ sequential RPCs for a 12-doctor page,
 * the single biggest source of the slow directory). Instead each doctor
 * costs exactly TWO parallel indexed reads (all of their active weekly
 * rules + all of their blocking appointments inside the 14-day window) and
 * every label is then derived in memory with the same pure slot engine the
 * booking flow uses (buildSlotsForDate).
 */
type AvailabilityContext = {
  /** Active weekly rules grouped by Dhaka dayOfWeek (0=Sun), per doctor. */
  dayRulesByDoctor: Map<string, Map<number, SlotRule[]>>;
  /** Blocking slotStart ISOs within the scan window, per doctor. */
  bookedByDoctor: Map<string, Set<string>>;
};

async function loadAvailabilityContext(
  doctorIds: string[]
): Promise<AvailabilityContext> {
  const dayRulesByDoctor = new Map<string, Map<number, SlotRule[]>>();
  const bookedByDoctor = new Map<string, Set<string>>();
  if (doctorIds.length === 0) {
    return { dayRulesByDoctor, bookedByDoctor };
  }

  const store = getStore();
  const todayStr = dhakaDateString();
  const windowStartIso = dhakaToUtc(todayStr, 0).toISOString();
  const windowEndIso = dhakaToUtc(
    addDays(todayStr, NEXT_AVAILABLE_WINDOW_DAYS),
    0
  ).toISOString();

  const [rulesLists, bookedLists] = await Promise.all([
    Promise.all(doctorIds.map((id) => store.listAvailabilityRules(id))),
    Promise.all(
      doctorIds.map((id) =>
        store
          .findBlockingSlotStarts(
            id,
            windowStartIso,
            windowEndIso,
            BLOCKING_STATUSES
          )
          .then((starts) => new Set(starts))
      )
    ),
  ]);

  doctorIds.forEach((id, index) => {
    const perDay = new Map<number, SlotRule[]>();
    for (const rule of rulesLists[index]) {
      if (!rule.isActive) continue;
      const list = perDay.get(rule.dayOfWeek) ?? [];
      list.push(rule);
      perDay.set(rule.dayOfWeek, list);
    }
    dayRulesByDoctor.set(id, perDay);
    bookedByDoctor.set(id, bookedLists[index]);
  });

  return { dayRulesByDoctor, bookedByDoctor };
}

/**
 * First Dhaka-local date (today..+13) on which the doctor has a slot that is
 * neither taken nor in the past, labeled "Today" / "Tomorrow" / "Sat, 14 Feb".
 * Pure — computed from the batched AvailabilityContext.
 */
function nextAvailableLabelFromContext(
  ctx: AvailabilityContext,
  doctorId: string,
  nowMs: number
): string | null {
  const dayRules = ctx.dayRulesByDoctor.get(doctorId);
  const booked = ctx.bookedByDoctor.get(doctorId);
  if (!dayRules || !booked) return null;

  let dateStr = dhakaDateString();
  for (let offset = 0; offset < NEXT_AVAILABLE_WINDOW_DAYS; offset++) {
    const rules = dayRules.get(dhakaDayOfWeek(dateStr)) ?? [];
    if (rules.length > 0) {
      const hasBookable = buildSlotsForDate(rules, dateStr, booked, nowMs).some(
        (slot) => !slot.taken && !slot.past
      );
      if (hasBookable) {
        if (offset === 0) return "Today";
        if (offset === 1) return "Tomorrow";
        return formatDateLabel(dateStr);
      }
    }
    dateStr = addDays(dateStr, 1);
  }
  return null;
}

/** Pure "has at least one bookable slot today" check for the filter. */
function hasBookableToday(
  ctx: AvailabilityContext,
  doctorId: string,
  nowMs: number
): boolean {
  const dayRules = ctx.dayRulesByDoctor.get(doctorId);
  const booked = ctx.bookedByDoctor.get(doctorId);
  if (!dayRules || !booked) return false;
  const todayStr = dhakaDateString();
  const rules = dayRules.get(dhakaDayOfWeek(todayStr)) ?? [];
  if (rules.length === 0) return false;
  return buildSlotsForDate(rules, todayStr, booked, nowMs).some(
    (slot) => !slot.taken && !slot.past
  );
}

// ───────────────────────── Page computation ─────────────────────────

async function computeDoctorsPage(
  parsed: ReturnType<typeof parseDoctorsQuery>
): Promise<DoctorsPage> {
  const {
    q,
    specialty,
    city,
    division,
    district,
    upazila,
    language,
    video,
    verified,
    maxFee,
    availableToday,
    page,
    pageSize,
    sort,
  } = parsed;

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

  // Nationwide geo resolution: a division means "any district inside it";
  // a district matches the doctor's recorded city; an upazila additionally
  // checks the chamber address text. Unknown geo values simply match nothing —
  // the UI then shows the honest empty-state with broader-search suggestions.
  const divisionDistricts = division
    ? new Set(districtsOf(division).map((d) => d.name.toLowerCase()))
    : null;
  const districtLower = district?.toLowerCase();
  const upazilaLower = upazila?.toLowerCase();

  const matched = rows.filter((row) => {
    if (qLower) {
      const haystack = [
        row.name,
        row.hospital?.name ?? "",
        row.city,
        ...row.specialties.map((s) => s.name),
      ];
      if (!haystack.some((value) => value.toLowerCase().includes(qLower))) {
        return false;
      }
    }
    if (cityLower && !row.city.toLowerCase().includes(cityLower)) {
      return false;
    }
    if (divisionDistricts && !divisionDistricts.has(row.city.toLowerCase())) {
      return false;
    }
    if (districtLower && !row.city.toLowerCase().includes(districtLower)) {
      return false;
    }
    if (upazilaLower) {
      const addr = `${row.city} ${row.chamberAddress ?? ""}`.toLowerCase();
      if (!addr.includes(upazilaLower)) {
        return false;
      }
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
      ratingAvg: average !== null ? Math.round(average * 10) / 10 : null,
      ratingCount: count,
    };
  });

  // availableToday is a post-filter that must run BEFORE pagination. It
  // shares ONE batched availability context (2 parallel indexed reads per
  // doctor) with the nextAvailableLabel computation below.
  let eligible = rated;
  const availabilityCtx = await loadAvailabilityContext(
    rated.map((entry) => entry.row.id)
  );
  if (wantsAvailableToday) {
    const nowMs = Date.now();
    eligible = rated.filter((entry) =>
      hasBookableToday(availabilityCtx, entry.row.id, nowMs)
    );
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

  // nextAvailableLabel comes from the SAME batched context (pure in-memory
  // computation — zero additional reads for the page).
  const labelNowMs = Date.now();
  const items: DoctorCard[] = pageEntries.map((entry) => ({
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
    nextAvailableLabel: nextAvailableLabelFromContext(
      availabilityCtx,
      entry.row.id,
      labelNowMs
    ),
  }));

  return { items, total, page, pageSize };
}

/**
 * One directory page for a raw query string (e.g. an URLSearchParams
 * toString()). Cached per exact query string for 60s — repeat hits are ~0ms
 * and the CDN s-maxage set by the routes serves most requests at the edge.
 */
export async function doctorsPage(search: string): Promise<DoctorsPage> {
  const parsed = parseDoctorsQuery(search);
  return cached(`v1:doctors:${search}`, 60_000, () =>
    computeDoctorsPage(parsed)
  );
}
