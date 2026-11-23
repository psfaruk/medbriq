import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import {
  GuardError,
  requireHospitalProfile,
} from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * /api/v2/hospital/* — the Hospital/Clinic dashboard API (master prompt §6).
 * Every route resolves the signed-in HOSPITAL user's own hospital — a
 * manager can never read another hospital's data (role separation).
 *
 *  GET  /overview     — KPIs + recent appointments
 *  GET  /branches     — list branches       POST — add branch
 *  GET  /departments  — list departments    POST — add department
 *  GET  /doctors      — doctors attached to this hospital
 *  GET  /appointments — appointments across this hospital's doctors
 *  GET  /revenue      — completed-visit revenue + commission split
 *  GET  /profile      — hospital profile    PUT — update profile
 *  PATCH /branches/:id, /departments/:id — update; DELETE — remove
 */

const branchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional(),
  isMain: z.boolean().optional(),
});

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  about: z.string().trim().max(400).optional(),
});

const profileSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  about: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(30).optional(),
  website: z.string().trim().max(200).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80).optional(),
});

/** Dhaka "today" as a YYYY-MM-DD string (UTC+6, no DST). */
function dhakaToday(): string {
  return new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
}

function dhakaDayBounds(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+06:00`);
  const end = new Date(start.getTime() + 24 * 3600_000);
  return { start, end };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { hospital } = await requireHospitalProfile();
    const { path } = await params;
    const section = path[0] ?? "";

    if (section === "overview") {
      const doctorIds = (
        await db.doctorProfile.findMany({
          where: { hospitalId: hospital.id },
          select: { id: true },
        })
      ).map((d) => d.id);

      const { start, end } = dhakaDayBounds(dhakaToday());
      const [
        branchCount,
        departmentCount,
        doctorCount,
        verifiedDoctors,
        pendingDoctors,
        todaysAppointments,
        totalAppointments,
        pendingApprovals,
        completedAppointments,
        recent,
      ] = await Promise.all([
        db.hospitalBranch.count({ where: { hospitalId: hospital.id } }),
        db.hospitalDepartment.count({ where: { hospitalId: hospital.id } }),
        db.doctorProfile.count({ where: { hospitalId: hospital.id } }),
        db.doctorProfile.count({
          where: { hospitalId: hospital.id, verificationStatus: "VERIFIED" },
        }),
        db.doctorProfile.count({
          where: {
            hospitalId: hospital.id,
            verificationStatus: { in: ["PENDING", "UNDER_REVIEW", "MORE_INFO"] },
          },
        }),
        db.appointment.count({
          where: {
            doctorId: { in: doctorIds },
            slotStart: { gte: start, lt: end },
            status: { in: ["PENDING_APPROVAL", "CONFIRMED", "COMPLETED"] },
          },
        }),
        db.appointment.count({ where: { doctorId: { in: doctorIds } } }),
        db.appointment.count({
          where: {
            doctorId: { in: doctorIds },
            status: "PENDING_APPROVAL",
          },
        }),
        db.appointment.count({
          where: { doctorId: { in: doctorIds }, status: "COMPLETED" },
        }),
        db.appointment.findMany({
          where: { doctorId: { in: doctorIds } },
          orderBy: { slotStart: "desc" },
          take: 8,
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            chamber: { select: { name: true } },
          },
        }),
      ]);

      return ok({
        hospital: {
          id: hospital.id,
          name: hospital.name,
          slug: hospital.slug,
          city: hospital.city,
          verificationStatus: hospital.verificationStatus,
        },
        stats: {
          branchCount,
          departmentCount,
          doctorCount,
          verifiedDoctors,
          pendingDoctors,
          todaysAppointments,
          totalAppointments,
          pendingApprovals,
          completedAppointments,
        },
        recentAppointments: recent.map((a) => ({
          id: a.id,
          referenceCode: a.referenceCode,
          patientName: a.patientName,
          doctorName: a.doctor.user.name,
          chamberName: a.chamber?.name ?? null,
          status: a.status,
          paymentStatus: a.paymentStatus,
          slotStart: a.slotStart.toISOString(),
          fee: a.fee,
          currency: a.currency,
        })),
      });
    }

    if (section === "branches") {
      const rows = await db.hospitalBranch.findMany({
        where: { hospitalId: hospital.id },
        orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
      });
      return ok({
        items: rows.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          city: b.city,
          phone: b.phone,
          isMain: b.isMain,
          createdAt: b.createdAt.toISOString(),
        })),
      });
    }

    if (section === "departments") {
      const rows = await db.hospitalDepartment.findMany({
        where: { hospitalId: hospital.id },
        orderBy: { name: "asc" },
      });
      return ok({
        items: rows.map((d) => ({
          id: d.id,
          name: d.name,
          about: d.about,
          createdAt: d.createdAt.toISOString(),
        })),
      });
    }

    if (section === "doctors") {
      const rows = await db.doctorProfile.findMany({
        where: { hospitalId: hospital.id },
        include: {
          user: { select: { name: true, email: true } },
          specialties: { include: { specialty: true } },
          _count: { select: { appointments: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return ok({
        items: rows.map((d) => ({
          id: d.id,
          slug: d.slug,
          name: d.user.name,
          email: d.user.email,
          city: d.city,
          verificationStatus: d.verificationStatus,
          experienceYears: d.experienceYears,
          specialties: d.specialties.map((s) => s.specialty.name),
          appointmentCount: d._count.appointments,
          reviewCount: d._count.reviews,
        })),
      });
    }

    if (section === "appointments") {
      const doctorIds = (
        await db.doctorProfile.findMany({
          where: { hospitalId: hospital.id },
          select: { id: true },
        })
      ).map((d) => d.id);

      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status") ?? undefined;
      const rows = await db.appointment.findMany({
        where: {
          doctorId: { in: doctorIds },
          ...(status ? { status } : {}),
        },
        orderBy: { slotStart: "desc" },
        take: 100,
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          chamber: { select: { name: true } },
        },
      });
      return ok({
        items: rows.map((a) => ({
          id: a.id,
          referenceCode: a.referenceCode,
          patientName: a.patientName,
          patientPhone: a.patientPhone,
          doctorName: a.doctor.user.name,
          chamberName: a.chamber?.name ?? null,
          status: a.status,
          paymentStatus: a.paymentStatus,
          patientType: a.patientType,
          slotStart: a.slotStart.toISOString(),
          slotEnd: a.slotEnd.toISOString(),
          fee: a.fee,
          currency: a.currency,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    }

    if (section === "revenue") {
      const doctorIds = (
        await db.doctorProfile.findMany({
          where: { hospitalId: hospital.id },
          select: { id: true },
        })
      ).map((d) => d.id);

      const commissionPercent = Number(
        (await db.platformSetting.findUnique({
          where: { key: "commissionPercent" },
        }))?.value ?? "10"
      );

      const completed = await db.appointment.findMany({
        where: { doctorId: { in: doctorIds }, status: "COMPLETED" },
        orderBy: { slotStart: "desc" },
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          payments: true,
        },
      });

      const gross = completed.reduce((sum, a) => sum + a.fee, 0);
      const commission = Math.round((gross * commissionPercent) / 100);
      const byMonth = new Map<string, { month: string; revenue: number; visits: number }>();
      for (const a of completed) {
        const month = a.slotStart.toISOString().slice(0, 7);
        const entry = byMonth.get(month) ?? { month, revenue: 0, visits: 0 };
        entry.revenue += a.fee;
        entry.visits += 1;
        byMonth.set(month, entry);
      }

      return ok({
        commissionPercent,
        totals: {
          completedVisits: completed.length,
          grossRevenue: gross,
          commission,
          netRevenue: gross - commission,
          currency: "BDT",
        },
        monthly: Array.from(byMonth.values())
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6),
        payments: completed.slice(0, 25).map((a) => ({
          id: a.id,
          referenceCode: a.referenceCode,
          doctorName: a.doctor.user.name,
          patientName: a.patientName,
          fee: a.fee,
          currency: a.currency,
          paymentStatus: a.paymentStatus,
          method: a.payments[0]?.method ?? null,
          txnRef: a.payments[0]?.txnRef ?? null,
          slotStart: a.slotStart.toISOString(),
        })),
      });
    }

    if (section === "profile") {
      return ok({
        profile: {
          id: hospital.id,
          name: hospital.name,
          slug: hospital.slug,
          city: hospital.city,
          address: hospital.address,
          phone: hospital.phone,
          about: hospital.about,
          website: hospital.website,
          verificationStatus: hospital.verificationStatus,
          verificationNote: hospital.verificationNote,
        },
      });
    }

    return fail("Unknown hospital section.", 404, "NOT_FOUND");
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
    const { hospital } = await requireHospitalProfile();
    const { path } = await params;
    const section = path[0] ?? "";
    const raw: unknown = await req.json().catch(() => null);

    if (section === "branches") {
      const parsed = branchSchema.safeParse(raw);
      if (!parsed.success) {
        return fail(
          parsed.error.issues[0]?.message ?? "Invalid branch.",
          400,
          "VALIDATION_ERROR"
        );
      }
      const created = await db.hospitalBranch.create({
        data: {
          hospitalId: hospital.id,
          name: parsed.data.name,
          address: parsed.data.address,
          city: parsed.data.city,
          phone: parsed.data.phone ?? null,
          isMain: parsed.data.isMain ?? false,
        },
      });
      return ok({ branch: created });
    }

    if (section === "departments") {
      const parsed = departmentSchema.safeParse(raw);
      if (!parsed.success) {
        return fail(
          parsed.error.issues[0]?.message ?? "Invalid department.",
          400,
          "VALIDATION_ERROR"
        );
      }
      const created = await db.hospitalDepartment.create({
        data: {
          hospitalId: hospital.id,
          name: parsed.data.name,
          about: parsed.data.about ?? null,
        },
      });
      return ok({ department: created });
    }

    return fail("Unknown hospital section.", 404, "NOT_FOUND");
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { hospital } = await requireHospitalProfile();
    const { path } = await params;
    const [section, id] = path;
    if (!id) return fail("Resource id is required.", 400, "INVALID_BODY");
    const raw: unknown = await req.json().catch(() => null);

    if (section === "branches") {
      const parsed = branchSchema.partial().safeParse(raw);
      if (!parsed.success) {
        return fail("Invalid branch update.", 400, "VALIDATION_ERROR");
      }
      const existing = await db.hospitalBranch.findFirst({
        where: { id, hospitalId: hospital.id },
      });
      if (!existing) return fail("Branch not found.", 404, "NOT_FOUND");
      const updated = await db.hospitalBranch.update({
        where: { id },
        data: parsed.data,
      });
      return ok({ branch: updated });
    }

    if (section === "departments") {
      const parsed = departmentSchema.partial().safeParse(raw);
      if (!parsed.success) {
        return fail("Invalid department update.", 400, "VALIDATION_ERROR");
      }
      const existing = await db.hospitalDepartment.findFirst({
        where: { id, hospitalId: hospital.id },
      });
      if (!existing) return fail("Department not found.", 404, "NOT_FOUND");
      const updated = await db.hospitalDepartment.update({
        where: { id },
        data: parsed.data,
      });
      return ok({ department: updated });
    }

    return fail("Unknown hospital section.", 404, "NOT_FOUND");
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
    const { hospital } = await requireHospitalProfile();
    const { path } = await params;
    if (path[0] !== "profile") {
      return fail("Unknown hospital section.", 404, "NOT_FOUND");
    }
    const raw: unknown = await req.json().catch(() => null);
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid profile update.",
        400,
        "VALIDATION_ERROR"
      );
    }
    // The patch schema only exposes safe editable fields — no id/slug/
    // verification keys to strip (they are not in parsed.data).
    const data = parsed.data;
    const updated = await db.hospital.update({
      where: { id: hospital.id },
      data,
    });
    return ok({
      profile: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        city: updated.city,
        address: updated.address,
        phone: updated.phone,
        about: updated.about,
        website: updated.website,
        verificationStatus: updated.verificationStatus,
        verificationNote: updated.verificationNote,
      },
    });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { hospital } = await requireHospitalProfile();
    const { path } = await params;
    const [section, id] = path;
    if (!id) return fail("Resource id is required.", 400, "INVALID_BODY");

    if (section === "branches") {
      const existing = await db.hospitalBranch.findFirst({
        where: { id, hospitalId: hospital.id },
      });
      if (!existing) return fail("Branch not found.", 404, "NOT_FOUND");
      if (existing.isMain) {
        return fail(
          "The main branch cannot be deleted.",
          409,
          "MAIN_BRANCH"
        );
      }
      await db.hospitalBranch.delete({ where: { id } });
      return ok({ deleted: true });
    }

    if (section === "departments") {
      const existing = await db.hospitalDepartment.findFirst({
        where: { id, hospitalId: hospital.id },
      });
      if (!existing) return fail("Department not found.", 404, "NOT_FOUND");
      await db.hospitalDepartment.delete({ where: { id } });
      return ok({ deleted: true });
    }

    return fail("Unknown hospital section.", 404, "NOT_FOUND");
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}
