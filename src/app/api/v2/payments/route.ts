import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import {
  GuardError,
  requireSession,
  featureEnabled,
} from "@/app/api/v2/_lib/guards";
import { notifyUser } from "@/app/api/v1/_lib/booking";

export const dynamic = "force-dynamic";

/**
 * /api/v2/payments — sandbox payment processing (master prompt §3.24-25).
 *
 *  GET  /api/v2/payments             — the signed-in user's payment history
 *  POST /api/v2/payments             — pay for an appointment
 *       body { appointmentId, method }
 *
 * HONESTY NOTE: this is a SANDBOX SIMULATION. No real money moves and no
 * gateway is contacted — the UI labels every payment screen "Sandbox demo
 * payment". A real bKash/Nagad/SSLCommerz integration replaces the
 * simulateGateway step behind the same API contract.
 *
 * Status axes stay separated (corrections #12): the Payment row is the
 * transaction ledger; Appointment.paymentStatus is the booking summary.
 */

const paySchema = z.object({
  appointmentId: z.string().trim().min(1),
  method: z.enum(["BKASH", "NAGAD", "CARD"]),
});

function txnRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SBX-${code}`;
}

export async function GET() {
  try {
    const user = await requireSession();
    const rows = await db.payment.findMany({
      where: { appointment: { patientId: user.id } },
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });
    return ok({
      items: rows.map((p) => ({
        id: p.id,
        appointmentId: p.appointmentId,
        referenceCode: p.appointment.referenceCode,
        doctorName: p.appointment.doctor.user.name,
        method: p.method,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        txnRef: p.txnRef,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      })),
    });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();

    if (!(await featureEnabled("onlinePayments"))) {
      return fail(
        "Online payments are currently disabled by the platform.",
        503,
        "MODULE_DISABLED"
      );
    }

    const raw: unknown = await req.json().catch(() => null);
    const parsed = paySchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid payment request.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const { appointmentId, method } = parsed.data;

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { include: { user: true } } },
    });
    if (!appointment || appointment.patientId !== user.id) {
      return fail("Appointment not found.", 404, "NOT_FOUND");
    }
    if (appointment.paymentStatus === "PAID") {
      return fail(
        "This appointment is already paid.",
        409,
        "ALREADY_PAID"
      );
    }
    // Only pending/confirmed bookings can be paid — not cancelled or
    // completed-past ones.
    if (
      !["PENDING_APPROVAL", "CONFIRMED"].includes(appointment.status)
    ) {
      return fail(
        "This appointment can no longer be paid (status has changed).",
        409,
        "INVALID_STATUS"
      );
    }

    // Idempotency: at most one Payment row per appointment (unique FK).
    const existing = await db.payment.findUnique({
      where: { appointmentId },
    });
    if (existing && existing.status === "SUCCEEDED") {
      return ok({
        payment: { id: existing.id, status: existing.status },
        replay: true,
      });
    }

    // ── Sandbox gateway simulation ──
    // Creates a real Payment ledger row + flips the booking's payment axis.
    // Clearly labelled as sandbox everywhere in the UI.
    const payment = existing
      ? await db.payment.update({
          where: { id: existing.id },
          data: {
            method,
            amount: appointment.fee,
            currency: appointment.currency,
            status: "SUCCEEDED",
            txnRef: txnRef(),
            failureReason: null,
            paidAt: new Date(),
          },
        })
      : await db.payment.create({
          data: {
            appointmentId,
            method,
            amount: appointment.fee,
            currency: appointment.currency,
            status: "SUCCEEDED",
            txnRef: txnRef(),
            paidAt: new Date(),
          },
        });

    await db.appointment.update({
      where: { id: appointmentId },
      data: { paymentStatus: "PAID" },
    });

    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "PAYMENT_SUCCEEDED",
        entity: "Payment",
        entityId: payment.id,
        meta: JSON.stringify({
          appointmentId,
          method,
          amount: appointment.fee,
          sandbox: true,
        }),
      },
    });

    // Fire-and-forget confirmation (no medical info in the body).
    await notifyUser(
      user.id,
      "APPOINTMENT_PAID",
      "Payment received",
      `Sandbox payment of ${appointment.fee} ${appointment.currency} for ${appointment.referenceCode} was recorded.`,
      { appointmentId, referenceCode: appointment.referenceCode }
    );

    return ok({
      payment: {
        id: payment.id,
        appointmentId,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        txnRef: payment.txnRef,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      },
    });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}
