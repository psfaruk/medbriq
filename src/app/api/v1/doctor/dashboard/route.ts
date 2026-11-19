import { getStore } from "@/lib/data";
import type { AppointmentRecord } from "@/lib/data/types";
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
 *
 * All aggregations are computed in memory from the doctor's appointments
 * (store-level list + JS filtering/sorting) — the same demo-scale tradeoff
 * documented in src/lib/data/types.ts, kept identical across both stores.
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

    const store = getStore();
    const profile = await store.getDoctorByUserId(user.id);
    if (!profile) {
      return fail("Doctor profile not found.", 404, "PROFILE_NOT_FOUND");
    }

    const now = new Date();
    // Dhaka-local "today" as a UTC [start, end) range.
    const todayStr = dhakaDateString(now);
    const dayStart = dhakaToUtc(todayStr, 0);
    const dayEnd = dhakaToUtc(todayStr, 1440);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const [appointments, availabilityRows] = await Promise.all([
      store.listAppointmentsByDoctor(profile.id),
      store.listAvailabilityRules(profile.id),
    ]);

    const todayTotal = appointments.filter(
      (appt) =>
        ["PENDING_APPROVAL", "CONFIRMED", "COMPLETED"].includes(appt.status) &&
        new Date(appt.slotStart).getTime() >= dayStart.getTime() &&
        new Date(appt.slotStart).getTime() < dayEnd.getTime()
    ).length;
    const pendingRequests = appointments.filter(
      (appt) => appt.status === "PENDING_APPROVAL"
    ).length;
    const confirmedUpcoming = appointments.filter(
      (appt) =>
        appt.status === "CONFIRMED" &&
        new Date(appt.slotStart).getTime() > now.getTime()
    ).length;
    const completedTotal = appointments.filter(
      (appt) => appt.status === "COMPLETED"
    ).length;

    // Rating aggregation in memory (null when there are no reviews).
    const ratingCount = profile.reviewRatings.length;
    const ratingAvgRaw =
      ratingCount > 0
        ? profile.reviewRatings.reduce((sum, rating) => sum + rating, 0) /
          ratingCount
        : null;

    const bySlotStartAsc = (a: AppointmentRecord, b: AppointmentRecord) =>
      a.slotStart.localeCompare(b.slotStart);

    const pendingRows = appointments
      .filter((appt) => appt.status === "PENDING_APPROVAL")
      .sort(bySlotStartAsc)
      .slice(0, 20);
    const upcomingRows = appointments
      .filter(
        (appt) =>
          appt.status === "CONFIRMED" &&
          new Date(appt.slotEnd).getTime() > twoHoursAgo.getTime()
      )
      .sort(bySlotStartAsc)
      .slice(0, 20);

    const doctorCardInfo = {
      slug: profile.slug,
      name: user.name,
      city: profile.city,
      consultationFee: profile.consultationFee,
      specialties: profile.specialties.map((s) => s.name),
    };

    const toDto = (appt: AppointmentRecord): AppointmentDto => ({
      id: appt.id,
      referenceCode: appt.referenceCode,
      status: appt.status as AppointmentDto["status"],
      type: appt.type as AppointmentDto["type"],
      bookingMode: appt.bookingMode as AppointmentDto["bookingMode"],
      fee: appt.fee,
      currency: appt.currency,
      slotStart: appt.slotStart,
      slotEnd: appt.slotEnd,
      patientName: appt.patientName,
      patientPhone: appt.patientPhone,
      patientAge: appt.patientAge,
      patientGender: appt.patientGender,
      notes: appt.notes,
      doctorNote: appt.doctorNote,
      createdAt: appt.createdAt,
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
          ratingAvgRaw !== null ? Math.round(ratingAvgRaw * 10) / 10 : null,
        ratingCount,
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
