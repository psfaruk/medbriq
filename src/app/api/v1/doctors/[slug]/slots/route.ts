import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getSlotsForDate } from "@/lib/slots";
import { dateStrSchema } from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors/[slug]/slots?date=YYYY-MM-DD
 *
 * Returns the derived slots (from the doctor's weekly AvailabilityRule rows)
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

    const parsed = dateStrSchema.safeParse(dateParam);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid date.",
        400,
        "INVALID_DATE"
      );
    }

    const doctor = await db.doctorProfile.findUnique({
      where: { slug },
      select: { id: true, verificationStatus: true },
    });
    if (!doctor || doctor.verificationStatus !== "VERIFIED") {
      return fail("Doctor not available for booking.", 404, "NOT_FOUND");
    }

    const slots = await getSlotsForDate(doctor.id, parsed.data);

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
