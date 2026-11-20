import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { GuardError, requireSession } from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * /api/v2/auth — role-aware extensions that the v1 auth stack (patients,
 * doctors, OTP, Google) does not cover.
 *
 *  GET  /api/v2/auth/context      — extra session context per role
 *  POST /api/v2/auth/hospital-register — Hospital dashboard onboarding
 *     (master prompt §6: Register → Verification → Add Branch → …)
 */

const hospitalRegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  hospitalName: z.string().trim().min(3).max(120),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> }
) {
  try {
    const { action } = await params;
    if (action[0] !== "context") {
      return fail("Unknown auth action.", 404, "NOT_FOUND");
    }

    const user = await requireSession();
    const context: Record<string, unknown> = { role: user.role };

    if (user.role === "HOSPITAL") {
      const hospital = await db.hospital.findUnique({
        where: { userId: user.id },
        include: {
          _count: { select: { branches: true, departments: true, doctors: true } },
        },
      });
      if (hospital) {
        context.hospital = {
          id: hospital.id,
          slug: hospital.slug,
          name: hospital.name,
          city: hospital.city,
          verificationStatus: hospital.verificationStatus,
          verificationNote: hospital.verificationNote,
          branchCount: hospital._count.branches,
          departmentCount: hospital._count.departments,
          doctorCount: hospital._count.doctors,
        };
      }
    }

    if (user.role === "DOCTOR") {
      const doctor = await db.doctorProfile.findUnique({
        where: { userId: user.id },
        include: { _count: { select: { chambers: true } } },
      });
      if (doctor) {
        context.doctor = {
          id: doctor.id,
          slug: doctor.slug,
          verificationStatus: doctor.verificationStatus,
          chamberCount: doctor._count.chambers,
        };
      }
    }

    return ok(context);
  } catch (err) {
    if (err instanceof GuardError) {
      return fail(err.message, err.status, err.code);
    }
    return handleRouteError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> }
) {
  try {
    const { action } = await params;
    if (action[0] !== "hospital-register") {
      return fail("Unknown auth action.", 404, "NOT_FOUND");
    }

    const raw: unknown = await req.json().catch(() => null);
    const parsed = hospitalRegisterSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid registration.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return fail(
        "An account with this email already exists. Try signing in instead.",
        409,
        "EMAIL_TAKEN"
      );
    }

    // Unique slug with a numeric suffix on collision.
    let slug = slugify(input.hospitalName);
    if (!slug) slug = "hospital";
    let candidate = slug;
    for (let i = 2; ; i++) {
      const clash = await db.hospital.findUnique({ where: { slug: candidate } });
      if (!clash) break;
      candidate = `${slug}-${i}`;
    }

    const user = await db.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        name: input.name,
        phone: input.phone ?? null,
        role: "HOSPITAL",
      },
    });

    const hospital = await db.hospital.create({
      data: {
        name: input.hospitalName,
        slug: candidate,
        city: input.city,
        address: input.address ?? null,
        phone: input.phone ?? null,
        userId: user.id,
        verificationStatus: "PENDING",
      },
    });

    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "HOSPITAL_REGISTERED",
        entity: "Hospital",
        entityId: hospital.id,
        meta: JSON.stringify({ email: user.email, city: input.city }),
      },
    });

    await createSession(user.id);

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      hospital: { id: hospital.id, slug: hospital.slug, name: hospital.name },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
