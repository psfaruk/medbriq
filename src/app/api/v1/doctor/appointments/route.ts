import type { NextRequest } from "next/server";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { isModuleEnabled } from "@/lib/modules";
import { dhakaDateString } from "@/lib/time";
import { toAppointmentDto } from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctor/appointments?status=&date=&limit=
 *
 * The signed-in doctor's appointments across all statuses (dashboard queue,
 * confirmed, completed, cancelled/no-show views - master prompt 4.7-11).
 * The v1 doctor dashboard endpoint only returns pending + upcoming; this
 * route covers the full status history for the appointments manager.
 *
 * Store-agnostic parity contract: this route MUST go through getStore()
 * (never import the Prisma client directly) so Firestore deployments read
 * the same data the booking routes write — a direct-db read would show a
 * stale SQLite copy in Firestore mode.
 *
 * Dhaka-local date filter: `date=YYYY-MM-DD` limits slots to that day
 * (UTC+6, no DST).
 */
const VALID_STATUSES = new Set([
  "PENDING_APPROVAL",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "COMPLETED",
  "NO_SHOW",
  "EXPIRED",
]);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "DOCTOR") {
      return fail("Doctor sign-in required.", 401, "UNAUTHORIZED");
    }

    const store = getStore();
    const profile = await store.getDoctorByUserId(user.id);
    if (!profile) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    // EXPIRED lifecycle (lazy sweep — same pattern as the slots route):
    // PENDING_APPROVAL requests whose slot already passed move to EXPIRED so
    // the manager stops offering actions on dead requests. Only on the
    // booking-enabled store — this is a write.
    if (isModuleEnabled("appointmentBooking")) {
      try {
        await store.expireStalePendingAppointments(profile.id);
      } catch {
        // Sweep is best-effort — never block the appointment manager.
      }
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? "";
    const dateParam = searchParams.get("date") ?? "";
    const limitParam = Number(searchParams.get("limit") ?? "100");

    if (statusParam && !VALID_STATUSES.has(statusParam)) {
      return fail("Invalid status filter.", 400, "VALIDATION_ERROR");
    }

    const all = await store.listAppointmentsByDoctor(profile.id);

    let rows = all;
    if (statusParam) {
      rows = rows.filter((a) => a.status === statusParam);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      rows = rows.filter(
        (a) => dhakaDateString(new Date(a.slotStart)) === dateParam
      );
    }
    rows = rows.sort((a, b) => b.slotStart.localeCompare(a.slotStart));
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, limitParam), 200)
      : 100;
    rows = rows.slice(0, limit);

    return ok({ items: rows.map(toAppointmentDto) });
  } catch (err) {
    return handleRouteError(err);
  }
}
