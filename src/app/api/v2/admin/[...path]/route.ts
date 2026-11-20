import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { storeKind } from "@/lib/data";
import { GuardError, requireRole } from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * /api/v2/admin/* — Super Admin panel extensions (master prompt §7) that
 * complement the existing /api/v1/admin routes (stats, users, doctors,
 * verifications, reviews, audit logs).
 *
 *  GET   /hospitals            — hospital directory + verification status
 *  POST  /hospitals/:id/decision — approve / reject / review a hospital
 *  GET   /payments             — full payment ledger
 *  POST  /payments/refund      — process a sandbox refund
 *  GET   /tickets              — support tickets (same data as
 *                                /api/v2/support for admins)
 *  GET   /flags                — feature flags        PUT — toggle
 *  GET   /platform             — platform settings    PUT — update
 *  GET   /system               — system health snapshot
 *
 * ADMIN role required on every route.
 */

async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await requireAdmin();
    const { path } = await params;
    const section = path[0] ?? "";

    if (section === "hospitals") {
      const rows = await db.hospital.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { doctors: true, branches: true } },
          user: { select: { name: true, email: true } },
        },
      });
      return ok({
        items: rows.map((h) => ({
          id: h.id,
          name: h.name,
          slug: h.slug,
          city: h.city,
          address: h.address,
          phone: h.phone,
          verificationStatus: h.verificationStatus,
          verificationNote: h.verificationNote,
          managerName: h.user?.name ?? null,
          managerEmail: h.user?.email ?? null,
          doctorCount: h._count.doctors,
          branchCount: h._count.branches,
        })),
      });
    }

    if (section === "payments") {
      const rows = await db.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          appointment: {
            include: {
              doctor: { include: { user: { select: { name: true } } } },
              patient: { select: { name: true } },
            },
          },
        },
      });
      const totals = {
        succeeded: rows.filter((p) => p.status === "SUCCEEDED"),
        refunded: rows.filter((p) => p.status === "REFUNDED"),
      };
      return ok({
        items: rows.map((p) => ({
          id: p.id,
          appointmentId: p.appointmentId,
          referenceCode: p.appointment.referenceCode,
          doctorName: p.appointment.doctor.user.name,
          patientName: p.appointment.patientName,
          method: p.method,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          txnRef: p.txnRef,
          createdAt: p.createdAt.toISOString(),
          paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        })),
        totals: {
          count: rows.length,
          succeededAmount: totals.succeeded.reduce((s, p) => s + p.amount, 0),
          refundedAmount: totals.refunded.reduce((s, p) => s + p.amount, 0),
          currency: "BDT",
        },
      });
    }

    if (section === "flags") {
      const rows = await db.featureFlag.findMany({ orderBy: { key: "asc" } });
      return ok({
        items: rows.map((f) => ({
          key: f.key,
          enabled: f.enabled,
          description: f.description,
          updatedAt: f.updatedAt.toISOString(),
        })),
      });
    }

    if (section === "platform") {
      const rows = await db.platformSetting.findMany({ orderBy: { key: "asc" } });
      const countries = await db.country.findMany({ orderBy: { name: "asc" } });
      return ok({
        settings: rows.map((s) => ({
          key: s.key,
          value: s.value,
          updatedAt: s.updatedAt.toISOString(),
        })),
        countries,
      });
    }

    if (section === "system") {
      const started = Date.now();
      await db.$queryRaw`SELECT 1`;
      const dbLatencyMs = Date.now() - started;
      const [
        users,
        doctors,
        hospitals,
        appointments,
        payments,
        tickets,
        flags,
      ] = await Promise.all([
        db.user.count(),
        db.doctorProfile.count(),
        db.hospital.count(),
        db.appointment.count(),
        db.payment.count(),
        db.supportTicket.count(),
        db.featureFlag.count(),
      ]);
      return ok({
        status: "healthy",
        dbLatencyMs,
        dataStore: storeKind(),
        runtime: {
          node: process.version,
          platform: process.platform,
          uptimeSeconds: Math.round(process.uptime()),
        },
        counts: {
          users,
          doctors,
          hospitals,
          appointments,
          payments,
          tickets,
          flags,
        },
      });
    }

    return fail("Unknown admin section.", 404, "NOT_FOUND");
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const admin = await requireAdmin();
    const { path } = await params;
    const raw: unknown = await req.json().catch(() => null);

    // POST /hospitals/:id/decision — verification decision.
    if (path[0] === "hospitals" && path[2] === "decision") {
      const id = path[1];
      const parsed = z
        .object({
          status: z.enum(["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"]),
          note: z.string().trim().max(500).optional(),
        })
        .safeParse(raw);
      if (!parsed.success) {
        return fail("Invalid decision.", 400, "VALIDATION_ERROR");
      }
      const hospital = await db.hospital.findUnique({ where: { id } });
      if (!hospital) return fail("Hospital not found.", 404, "NOT_FOUND");

      const updated = await db.hospital.update({
        where: { id },
        data: {
          verificationStatus: parsed.data.status,
          verificationNote: parsed.data.note ?? null,
          verifiedAt: parsed.data.status === "VERIFIED" ? new Date() : null,
        },
      });

      await db.auditLog.create({
        data: {
          actorId: admin.id,
          action: `HOSPITAL_${parsed.data.status}`,
          entity: "Hospital",
          entityId: id,
          meta: JSON.stringify({ note: parsed.data.note ?? null }),
        },
      });

      // Notify the hospital manager (fire-and-forget, no medical info).
      if (hospital.userId) {
        await db.notification.create({
          data: {
            userId: hospital.userId,
            type: "HOSPITAL_VERIFICATION_UPDATE",
            title: "Verification update",
            body: `Your hospital verification status is now ${parsed.data.status}.`,
            meta: JSON.stringify({ hospitalId: id }),
          },
        });
      }

      return ok({ hospital: updated });
    }

    // POST /payments/refund — sandbox refund processing.
    if (path[0] === "payments" && path[1] === "refund") {
      const parsed = z
        .object({ paymentId: z.string().trim().min(1) })
        .safeParse(raw);
      if (!parsed.success) {
        return fail("Invalid refund request.", 400, "VALIDATION_ERROR");
      }
      const payment = await db.payment.findUnique({
        where: { id: parsed.data.paymentId },
        include: { appointment: true },
      });
      if (!payment) return fail("Payment not found.", 404, "NOT_FOUND");
      if (payment.status !== "SUCCEEDED") {
        return fail(
          "Only successful payments can be refunded.",
          409,
          "INVALID_STATUS"
        );
      }

      const updated = await db.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
      await db.appointment.update({
        where: { id: payment.appointmentId },
        data: { paymentStatus: "REFUNDED", refundStatus: "PROCESSED" },
      });
      await db.auditLog.create({
        data: {
          actorId: admin.id,
          action: "REFUND_PROCESSED",
          entity: "Payment",
          entityId: payment.id,
          meta: JSON.stringify({
            appointmentId: payment.appointmentId,
            amount: payment.amount,
            sandbox: true,
          }),
        },
      });

      return ok({ payment: updated });
    }

    return fail("Unknown admin action.", 404, "NOT_FOUND");
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const admin = await requireAdmin();
    const { path } = await params;
    const raw: unknown = await req.json().catch(() => null);

    if (path[0] === "flags") {
      const parsed = z
        .object({
          key: z.string().trim().min(1),
          enabled: z.boolean(),
        })
        .safeParse(raw);
      if (!parsed.success) {
        return fail("Invalid flag update.", 400, "VALIDATION_ERROR");
      }
      const updated = await db.featureFlag.upsert({
        where: { key: parsed.data.key },
        update: {
          enabled: parsed.data.enabled,
          updatedBy: admin.id,
        },
        create: {
          key: parsed.data.key,
          enabled: parsed.data.enabled,
          updatedBy: admin.id,
        },
      });
      await db.auditLog.create({
        data: {
          actorId: admin.id,
          action: "FEATURE_FLAG_UPDATED",
          entity: "FeatureFlag",
          entityId: updated.id,
          meta: JSON.stringify({
            key: updated.key,
            enabled: updated.enabled,
          }),
        },
      });
      return ok({ flag: updated });
    }

    if (path[0] === "platform") {
      const parsed = z
        .object({
          key: z.string().trim().min(1),
          value: z.string().trim().min(1).max(200),
        })
        .safeParse(raw);
      if (!parsed.success) {
        return fail("Invalid setting update.", 400, "VALIDATION_ERROR");
      }
      const { key, value } = parsed.data;
      if (key === "commissionPercent") {
        const pct = Number(value);
        if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
          return fail(
            "Commission must be between 0 and 50 percent.",
            400,
            "VALIDATION_ERROR"
          );
        }
      }
      const updated = await db.platformSetting.upsert({
        where: { key },
        update: { value, updatedBy: admin.id },
        create: { key, value, updatedBy: admin.id },
      });
      await db.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PLATFORM_SETTING_UPDATED",
          entity: "PlatformSetting",
          entityId: updated.id,
          meta: JSON.stringify({ key, value }),
        },
      });
      return ok({ setting: updated });
    }

    return fail("Unknown admin action.", 404, "NOT_FOUND");
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}
