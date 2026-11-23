import type { NextRequest } from "next/server";
import { getStore } from "@/lib/data";
import { fail, handleRouteError, ok } from "@/lib/api";
import { cached } from "@/lib/cache";
import { isModuleEnabled } from "@/lib/modules";
import { getSlotsForDate } from "@/lib/slots";
import { dateStrSchema } from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors/[slug]/slots?date=YYYY-MM-DD
 *
 * Returns the derived slots (from the doctor's weekly availability rules)
 * for a single Dhaka-local date. Slots are hidden entirely (404) while the
 * doctor is not VERIFIED, so unverified profiles are never bookable.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const dateParam = new URL(req.url).searchParams.get("date") ?? "";
    const chamberParam = new URL(req.url).searchParams.get("chamberId") ?? "";

    const parsed = dateStrSchema.safeParse(dateParam);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid date.",
        400,
        "INVALID_DATE"
      );
    }

    const doctor = await getStore().getDoctorIdAndStatusBySlug(slug);
    if (!doctor || doctor.verificationStatus !== "VERIFIED") {
      return fail("Doctor not available for booking.", 404, "NOT_FOUND");
    }

    // EXPIRED lifecycle (lazy sweep): PENDING_APPROVAL requests whose slot
    // already passed move to EXPIRED (slot released) so they stop blocking
    // the calendar. Only on the booking-enabled store — this is a write.
    if (isModuleEnabled("appointmentBooking")) {
      try {
        await getStore().expireStalePendingAppointments(doctor.id);
      } catch {
        // Sweep is best-effort — never block the slot listing.
      }
    }

    // Optional chamber filter: rules that are chamber-specific to this
    // chamber plus the doctor's general (chamberId = null) rules.
    // 10s memory cache: the date picker walks day-by-day and re-hits the
    // same slug+date while browsing — no need to re-derive rules each time.
    // Mutations (booking / availability) invalidate the "v1:slots:" prefix.
    const slots = await cached(
      `v1:slots:${slug}:${parsed.data}:${chamberParam}`,
      10_000,
      () => getSlotsForDate(doctor.id, parsed.data, chamberParam || null)
    );

    return ok({
      date: parsed.data,
      // SlotInfoDto drops startMinute (client derives sections from startIso).
      slots: slots.map((s) => ({
        startIso: s.startIso,
        endIso: s.endIso,
        label: s.label,
        taken: s.taken,
        past: s.past,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
