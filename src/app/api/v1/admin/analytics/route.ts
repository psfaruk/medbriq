import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { analyticsSnapshot } from "../../analytics/event/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/analytics — aggregated first-party analytics counters.
 * Admin-only. Privacy note: counters are event names (+ view scopes) and
 * counts only — there is nothing personal to leak by construction.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.ADMIN) {
      return fail("Admin access required.", 403, "FORBIDDEN");
    }
    const events = analyticsSnapshot();
    const total = events.reduce((sum, e) => sum + e.count, 0);
    const funnel = {
      pageViews: events.find((e) => e.name === "page_view")?.count ?? 0,
      doctorSearches: events.find((e) => e.name === "doctor_search")?.count ?? 0,
      bookingStarts: events.find((e) => e.name === "booking_start")?.count ?? 0,
      bookingConfirmed: events.find((e) => e.name === "booking_confirmed")?.count ?? 0,
      registrationStarts: events.find((e) => e.name === "registration_start")?.count ?? 0,
      registrationCompletes: events.find((e) => e.name === "registration_complete")?.count ?? 0,
    };
    return ok({
      events,
      total,
      funnel,
      note: "In-memory counters — reset on server restart. No personal or health data is ever recorded.",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
