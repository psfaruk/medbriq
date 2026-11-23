import { z } from "zod";
import { getStore } from "@/lib/data";
import { sendPushToUser } from "@/lib/push";
import type { AppointmentRecord } from "@/lib/data/types";
import { dhakaDateString } from "@/lib/time";
import type {
  AppointmentStatus,
  AppointmentType,
  BookingMode,
} from "@/lib/constants";
import type { AppointmentDto } from "@/lib/types";

/**
 * Shared server-side helpers for the Find Medi Doctor booking engine routes.
 *
 * This folder is prefixed with "_" so Next.js treats it as a private
 * (non-routable) folder — it is only ever imported by /api/v1 route handlers.
 */

/** Strict "YYYY-MM-DD" that must also be a real calendar date. */
export const dateStrSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      Number.isFinite(y) &&
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }, "Date is not a real calendar date.");

export { normalizePhone, canonicalPhone } from "@/lib/phone";

/** Map a store appointment record (with the doctor join) to the client DTO. */
export function toAppointmentDto(row: AppointmentRecord): AppointmentDto {
  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: row.status as AppointmentStatus,
    type: row.type as AppointmentType,
    bookingMode: row.bookingMode as BookingMode,
    fee: row.fee,
    currency: row.currency,
    slotStart: row.slotStart,
    slotEnd: row.slotEnd,
    patientName: row.patientName,
    patientPhone: row.patientPhone,
    patientAge: row.patientAge,
    patientGender: row.patientGender,
    notes: row.notes,
    doctorNote: row.doctorNote,
    consultationNote: row.consultationNote,
    // Separated status axes (docs/ARCHITECTURE_CORRECTIONS.md #12) + the
    // pricing snapshot (docs/FEE_SYSTEM.md §3).
    paymentStatus: row.paymentStatus,
    consultationStatus: row.consultationStatus,
    refundStatus: row.refundStatus,
    patientType: row.patientType,
    feeSettingsVersion: row.feeSettingsVersion,
    pricedAt: row.pricedAt,
    createdAt: row.createdAt,
    chamberId: (row as { chamberId?: string | null }).chamberId ?? null,
    chamberName: (row as { chamberName?: string | null }).chamberName ?? null,
    doctor: {
      slug: row.doctor.slug,
      name: row.doctor.name,
      city: row.doctor.city,
      consultationFee: row.doctor.consultationFee,
      specialties: row.doctor.specialties,
    },
    patientId: row.patientId,
  };
}

/**
 * Fire-and-forget audit trail. An audit failure must never fail an action
 * that has already been committed, so errors are only logged server-side.
 */
export async function logAppointmentAction(
  action: string,
  appointmentId: string,
  actorId: string | null,
  meta: Record<string, unknown>
): Promise<void> {
  try {
    await getStore().createAuditLog({
      action,
      entity: "Appointment",
      entityId: appointmentId,
      actorId,
      meta: JSON.stringify(meta),
    });
  } catch (err) {
    console.error("[mfmd-audit]", action, err);
  }
}

/**
 * Fire-and-forget in-app notification. A notification failure must never
 * fail the action that triggered it, so errors are only logged server-side.
 * Notification bodies must never contain medical information (no notes).
 */
/**
 * Display name for doctors in user-facing text. Seeded names already carry a
 * "Dr." prefix — never double it.
 */
export function doctorDisplayName(name: string): string {
  const trimmed = name.trim();
  return /^(dr\.?|ডা\.?)\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

/**
 * Dhaka calendar date (YYYY-MM-DD) of a slot instant, for notification and
 * display labels. NEVER use raw `slotStart.slice(0, 10)` — that is the UTC
 * date, which is one day behind for every Dhaka slot before 06:00.
 */
export function slotDateLabel(slotStartIso: string): string {
  return dhakaDateString(new Date(slotStartIso));
}

/**
 * Guest-safe price breakdown: the unauthenticated preview/booking surface
 * must not disclose visit-history detail (visit ids, completion timestamps,
 * anchor/expiry dates) for an arbitrary phone number. Signed-in users keep
 * the full breakdown; guests keep the classification, fee and a date-free
 * explanation — enough to confirm a booking, nothing more.
 */
export function guestSafeBreakdown<
  B extends {
    patientType: string;
    fee: number;
    currency: string;
    explanation: string;
    basis: {
      rule: string;
      latestVisitId: string | null;
      latestVisitCompletedAt: string | null;
      anchorDate: string | null;
      returningExpiryDate: string | null;
      followUpExpiryDate: string | null;
      evaluatedAt: string;
      [k: string]: unknown;
    };
  },
>(breakdown: B): B {
  const rule = breakdown.basis.rule;
  const guestExplanation =
    rule === "WITHIN_FOLLOW_UP_WINDOW"
      ? "You have a recent completed visit with this doctor — the follow-up fee applies."
      : rule === "WITHIN_RETURNING_VALIDITY"
        ? "You have a completed visit with this doctor on record — the returning patient fee applies."
        : rule === "VALIDITY_EXPIRED"
          ? "Your returning-patient validity with this doctor has expired — the new patient fee applies."
          : "No completed visit with this doctor on record — first visit is charged at the new patient fee.";
  return {
    ...breakdown,
    explanation: guestExplanation,
    basis: {
      ...breakdown.basis,
      latestVisitId: null,
      latestVisitCompletedAt: null,
      anchorDate: null,
      returningExpiryDate: null,
      followUpExpiryDate: null,
      evaluatedAt: "",
    },
  };
}

export async function notifyUser(
  userId: string | null | undefined,
  type: string,
  title: string,
  body: string,
  meta: Record<string, unknown> | null
): Promise<void> {
  if (!userId) return;
  try {
    await getStore().createNotification({
      userId,
      type,
      title,
      body,
      meta: meta ? JSON.stringify(meta) : null,
    });
  } catch (err) {
    console.error("[mfmd-notify]", err);
  }
  // Best-effort web push (fire-and-forget — see src/lib/push.ts). The
  // in-app notification above stays the source of truth.
  let url: string | undefined;
  try {
    url = meta && typeof meta.url === "string" ? meta.url : undefined;
  } catch {
    url = undefined;
  }
  void sendPushToUser(userId, { title, body, url });
}
