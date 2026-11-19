import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import type { AdminStats } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/stats
 * Platform counters for the admin console overview cards.
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

    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments,
      confirmedAppointments,
      pendingApprovals,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: ROLES.PATIENT } }),
      db.doctorProfile.count(),
      db.doctorProfile.count({ where: { verificationStatus: "VERIFIED" } }),
      db.doctorProfile.count({
        where: {
          verificationStatus: { in: ["PENDING", "UNDER_REVIEW", "MORE_INFO"] },
        },
      }),
      db.appointment.count(),
      db.appointment.count({ where: { status: "CONFIRMED" } }),
      db.appointment.count({ where: { status: "PENDING_APPROVAL" } }),
    ]);

    const stats: AdminStats = {
      totalUsers,
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments,
      confirmedAppointments,
      pendingApprovals,
    };
    return ok(stats);
  } catch (err) {
    return handleRouteError(err);
  }
}
