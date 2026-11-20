import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { ROLES } from "@/lib/constants";
import { requireModule } from "@/lib/modules";
import type { FeeHistoryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctor/fee-settings/history?limit=20
 *
 * The signed-in doctor's versioned fee-settings history, newest first.
 * Every version is immutable — confirmed appointments point at the version
 * they were priced under (docs/FEE_SYSTEM.md §5).
 */
export async function GET(req: NextRequest) {
  try {
    requireModule("appointmentBooking");

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to view fee history.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can view fee history.", 403, "FORBIDDEN");
    }

    const store = getStore();
    const doctor = await store.getDoctorByUserId(user.id);
    if (!doctor) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? "20");
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : 20;

    const rows = await store.listFeeSettingsHistory(doctor.id, limit);
    const items: FeeHistoryItem[] = rows.map((row) => ({
      id: row.id,
      version: row.version,
      newPatientFee: row.newPatientFee,
      returningPatientFee: row.returningPatientFee,
      returningValidityValue: row.returningValidityValue,
      returningValidityUnit: row.returningValidityUnit as "DAYS" | "MONTHS",
      followUpEnabled: row.followUpEnabled,
      followUpFee: row.followUpFee,
      followUpValidityValue: row.followUpValidityValue,
      followUpValidityUnit: row.followUpValidityUnit as "DAYS" | "MONTHS",
      changeReason: row.changeReason,
      changedBy: row.changedBy,
      createdAt: row.createdAt,
    }));

    return ok({ items });
  } catch (err) {
    return handleRouteError(err);
  }
}
