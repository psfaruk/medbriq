import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { dhakaDateString, dhakaToUtc } from "@/lib/time";
import type { AppointmentDto, DoctorDashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctor/dashboard
 * Aggregated doctor workspace: stats, pending requests, upcoming confirmed
 * appointments, weekly availability, and the doctor's editable profile fields.
 */

/** Editable profile fields echoed back for the Profile tab form. */
type DoctorProfileFields = {
  bio: string | null;
  experienceYears: number;
  consultationFee: number;
  followUpFee: number;
  videoConsultFee: number | null;
  chamberAddress: string | null;
  city: string;
  languages: string | null;
  supportsVideo: boolean;
  requiresApproval: boolean;
  regNumber: string | null;
  verificationStatus: string;
  verificationNote: string | null;
};

type DashboardResponse = DoctorDashboardData & { profile: DoctorProfileFields };

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail(
        "This dashboard is only available to doctor accounts.",
        403,
        "FORBIDDEN"
      );
    }

    const profile = await db.doctorProfile.findUnique({
      where: { userId: user.id },
      include: {
        specialties: { include: { specialty: { select: { name: true } } } },
      },
    });
    if (!profile) {
      return fail("Doctor profile not found.", 404, "PROFILE_NOT_FOUND");
    }

    const now = new Date();
    // Dhaka-local "today" as a UTC [start, end) range.
    const todayStr = dhakaDateString(now);
    const dayStart = dhakaToUtc(todayStr, 0);
    const dayEnd = dhakaToUtc(todayStr, 1440);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const [
      todayTotal,
      pendingRequests,
      confirmedUpcoming,
      completedTotal,
      ratingAgg,
      pendingRows,
      upcomingRows,
      availabilityRows,
    ] = await Promise.all([
      db.appointment.count({
        where: {
          doctorId: profile.id,
          status: { in: ["PENDING_APPROVAL", "CONFIRMED", "COMPLETED"] },
          slotStart: { gte: dayStart, lt: dayEnd },
        },
      }),
      db.appointment.count({
        where: { doctorId: profile.id, status: "PENDING_APPROVAL" },
      }),
      db.appointment.count({
        where: {
          doctorId: profile.id,
          status: "CONFIRMED",
          slotStart: { gt: now },
        },
      }),
      db.appointment.count({
        where: { doctorId: profile.id, status: "COMPLETED" },
      }),
      db.review.aggregate({
        where: { doctorId: profile.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      db.appointment.findMany({
        where: { doctorId: profile.id, status: "PENDING_APPROVAL" },
        orderBy: { slotStart: "asc" },
        take: 20,
      }),
      db.appointment.findMany({
        where: {
          doctorId: profile.id,
          status: "CONFIRMED",
          slotEnd: { gt: twoHoursAgo },
        },
        orderBy: { slotStart: "asc" },
        take: 20,
      }),
      db.availabilityRule.findMany({
        where: { doctorId: profile.id },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
      }),
    ]);

    const doctorCardInfo = {
      slug: profile.slug,
      name: user.name,
      city: profile.city,
      consultationFee: profile.consultationFee,
      specialties: profile.specialties.map((ds) => ds.specialty.name),
    };

    const toDto = (
      appt: typeof pendingRows[number]
    ): AppointmentDto => ({
      id: appt.id,
      referenceCode: appt.referenceCode,
      status: appt.status as AppointmentDto["status"],
      type: appt.type as AppointmentDto["type"],
      bookingMode: appt.bookingMode as AppointmentDto["bookingMode"],
      fee: appt.fee,
      currency: appt.currency,
      slotStart: appt.slotStart.toISOString(),
      slotEnd: appt.slotEnd.toISOString(),
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      patientAge: appt.patientAge,
      patientGender: appt.patientGender,
      notes: appt.notes,
      doctorNote: appt.doctorNote,
      createdAt: appt.createdAt.toISOString(),
      doctor: doctorCardInfo,
      patientId: appt.patientId,
    });

    const data: DashboardResponse = {
      stats: {
        todayTotal,
        pendingRequests,
        confirmedUpcoming,
        completedTotal,
        ratingAvg:
          ratingAgg._avg.rating === null
            ? null
            : Math.round(ratingAgg._avg.rating * 10) / 10,
        ratingCount: ratingAgg._count.rating,
      },
      pending: pendingRows.map(toDto),
      upcoming: upcomingRows.map(toDto),
      availability: availabilityRows.map((rule) => ({
        id: rule.id,
        dayOfWeek: rule.dayOfWeek,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
        isActive: rule.isActive,
      })),
      profile: {
        bio: profile.bio,
        experienceYears: profile.experienceYears,
        consultationFee: profile.consultationFee,
        followUpFee: profile.followUpFee,
        videoConsultFee: profile.videoConsultFee,
        chamberAddress: profile.chamberAddress,
        city: profile.city,
        languages: profile.languages,
        supportsVideo: profile.supportsVideo,
        requiresApproval: profile.requiresApproval,
        regNumber: profile.regNumber,
        verificationStatus: profile.verificationStatus,
        verificationNote: profile.verificationNote,
      },
    };

    return ok(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
