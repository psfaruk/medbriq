import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctor/appointments?status=&date=&limit=
 *
 * The signed-in doctor's appointments across all statuses (dashboard queue,
 * confirmed, completed, cancelled/no-show views - master prompt 4.7-11).
 * The v1 doctor dashboard endpoint only returns pending + upcoming; this
 * route covers the full status history for the appointments manager.
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

    const profile = await db.doctorProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") ?? "";
    const dateParam = searchParams.get("date") ?? "";
    const limitParam = Number(searchParams.get("limit") ?? "100");

    if (statusParam && !VALID_STATUSES.has(statusParam)) {
      return fail("Invalid status filter.", 400, "VALIDATION_ERROR");
    }

    let startUtc: Date | undefined;
    let endUtc: Date | undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      startUtc = new Date(`${dateParam}T00:00:00+06:00`);
      endUtc = new Date(startUtc.getTime() + 24 * 3600_000);
    }

    const rows = await db.appointment.findMany({
      where: {
        doctorId: profile.id,
        ...(statusParam ? { status: statusParam } : {}),
        ...(startUtc && endUtc
          ? { slotStart: { gte: startUtc, lt: endUtc } }
          : {}),
      },
      orderBy: { slotStart: "desc" },
      take: Number.isFinite(limitParam)
        ? Math.min(Math.max(1, limitParam), 200)
        : 100,
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        chamber: { select: { id: true, name: true, address: true } },
      },
    });

    return ok({
      items: rows.map((a) => ({
        id: a.id,
        referenceCode: a.referenceCode,
        status: a.status,
        type: a.type,
        bookingMode: a.bookingMode,
        fee: a.fee,
        currency: a.currency,
        slotStart: a.slotStart.toISOString(),
        slotEnd: a.slotEnd.toISOString(),
        patientName: a.patientName,
        patientPhone: a.patientPhone,
        patientAge: a.patientAge,
        patientGender: a.patientGender,
        notes: a.notes,
        doctorNote: a.doctorNote,
        consultationNote: a.consultationNote,
        paymentStatus: a.paymentStatus,
        consultationStatus: a.consultationStatus,
        refundStatus: a.refundStatus,
        patientType: a.patientType,
        feeSettingsVersion: a.feeSettingsVersion,
        pricedAt: a.pricedAt ? a.pricedAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        chamberId: a.chamberId,
        chamberName: a.chamber?.name ?? null,
        doctor: {
          slug: profile.slug,
          name: a.doctor.user.name,
          city: a.doctor.city,
          consultationFee: a.doctor.consultationFee,
          specialties: [],
        },
        patientId: a.patientId,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
