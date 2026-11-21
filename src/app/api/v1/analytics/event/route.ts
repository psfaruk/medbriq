import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, handleRouteError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/analytics/event — first-party, privacy-respecting analytics.
 *
 * Design rules (spec §17):
 *  - Whitelisted event names only; everything else is silently ignored
 *    (a 200 with counted:false, so the client never retries).
 *  - meta is restricted to a coarse scope tag + resultCount. No free text,
 *    no search queries, no health data, no identifiers.
 *  - Aggregation is in-memory on globalThis (survives warm serverless
 *    instances; resets on cold start — documented demo limitation, fine
 *    for funnel signals at this scale, and private by construction).
 */

const ALLOWED_EVENTS = new Set([
  "page_view",
  "doctor_search",
  "hospital_search",
  "profile_view_doctor",
  "profile_view_hospital",
  "article_view",
  "symptom_view",
  "equipment_view",
  "cta_click",
  "registration_start",
  "registration_complete",
  "booking_start",
  "booking_confirmed",
]);

export type AnalyticsCounter = {
  name: string;
  count: number;
  lastAt: string;
};

type Agg = Map<string, AnalyticsCounter>;

const globalForAnalytics = globalThis as unknown as {
  __medbriqAnalytics: Agg | undefined;
};

const agg: Agg = (globalForAnalytics.__medbriqAnalytics ??= new Map());

const bodySchema = z.object({
  name: z.string().trim().max(60),
  meta: z
    .object({
      scope: z.string().trim().max(60).optional(),
      resultCount: z.coerce.number().int().min(0).max(100000).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return ok({ counted: false });
    }
    const { name, meta } = parsed.data;
    if (!ALLOWED_EVENTS.has(name)) {
      return ok({ counted: false });
    }
    // Only page_view keeps scope detail (view name); searches store just
    // the event + result count — never the query itself.
    const key = name === "page_view" && meta?.scope ? `${name}|${meta.scope}` : name;
    const existing = agg.get(key);
    agg.set(key, {
      name: key,
      count: (existing?.count ?? 0) + 1,
      lastAt: new Date().toISOString(),
    });
    return ok({ counted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Aggregate snapshot (consumed by the admin analytics endpoint). */
export function analyticsSnapshot(): AnalyticsCounter[] {
  return [...agg.values()].sort((a, b) => b.count - a.count);
}
