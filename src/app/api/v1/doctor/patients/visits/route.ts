import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import { ROLES } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { requireModule } from "@/lib/modules";
import type { VisitHistoryItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctor/patients/visits?phone=%2B8801...
 *
 * One patient's COMPLETED-visit history **with the signed-in doctor only**.
 * The query is scoped by doctorId in the data layer — another doctor's
 * patient history is unreachable, not merely hidden (docs/FEE_SYSTEM.md §6
 * authorization rules).
 */
export async function GET(req: NextRequest) {
  try {
    requireModule("appointmentBooking");

    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in as a doctor to look up patient history.", 401, "UNAUTHENTICATED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail("Only doctors can look up patient visit history.", 403, "FORBIDDEN");
    }

    const store = getStore();
    const doctor = await store.getDoctorByUserId(user.id);
    if (!doctor) {
      return fail("Doctor profile not found.", 404, "NOT_FOUND");
    }

    const phoneParam = new URL(req.url).searchParams.get("phone")?.trim() ?? "";
    if (!phoneParam) {
      return fail("Provide the patient's phone number (?phone=…).", 400, "VALIDATION_ERROR");
    }
    const phone = normalizePhone(phoneParam);

    const visits = await store.listPatientVisitsForDoctor(doctor.id, {
      patientId: null,
      phone,
    });

    // Best-effort display name for the patient (same phone → same account).
    const account = await store.findUserByPhone(phone);
    const patientName = account?.name ?? null;

    const items: VisitHistoryItem[] = visits.map((v) => ({
      id: v.id,
      appointmentId: v.appointmentId,
      patientName,
      slotStart: v.slotStart,
      completedAt: v.completedAt,
      qualifying: v.qualifying,
      paymentStatusAtCompletion: v.paymentStatusAtCompletion,
    }));

    return ok({ patientName, phone, items });
  } catch (err) {
    return handleRouteError(err);
  }
}
