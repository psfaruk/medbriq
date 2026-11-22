import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { GuardError, requireSession } from "@/app/api/v2/_lib/guards";
import { toSessionUser } from "@/app/api/v1/_lib/session-user";

export const dynamic = "force-dynamic";

/**
 * /api/v2/auth — role-aware extensions that the v1 auth stack (patients,
 * doctors, OTP, Google) does not cover.
 *
 *  GET  /api/v2/auth/context        — extra session context per role
 *  POST /api/v2/auth/apply-doctor   — signed-in user applies as a doctor
 *  POST /api/v2/auth/apply-hospital — signed-in user registers a hospital
 *
 * Patient-first onboarding (master prompt §3.1): everyone signs up as a user;
 * doctor/hospital applications happen AFTER login, from the dashboard.
 * Applications go through the dual DataStore so both Prisma (local) and
 * Firestore (production) deployments behave identically. The legacy
 * hospital-register endpoint (which bypassed the store abstraction and was
 * therefore broken on Firestore deployments) has been removed — the public
 * signup form is patient-only.
 */

const applyDoctorSchema = z.object({
  specialtySlug: z.string().trim().min(1, "Select a specialty."),
  regNumber: z
    .string()
    .trim()
    .min(3, "BMDC registration number must be at least 3 characters.")
    .max(60, "Registration number must be at most 60 characters."),
  experienceYears: z
    .number()
    .int("Experience must be a whole number of years.")
    .min(0, "Experience cannot be negative.")
    .max(60, "Experience must be at most 60 years."),
  consultationFee: z
    .number()
    .positive("Consultation fee must be greater than zero."),
  followUpFee: z.number().min(0).default(0),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters.")
    .max(60, "City must be at most 60 characters."),
  chamberAddress: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
});

const applyHospitalSchema = z.object({
  hospitalName: z
    .string()
    .trim()
    .min(3, "Hospital name must be at least 3 characters.")
    .max(120, "Hospital name must be at most 120 characters."),
  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters.")
    .max(80, "City must be at most 80 characters."),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
});

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "hospital"
  );
}

/** Appends "-2", "-3", ... until the slug is free (store-aware). */
async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 300; i++) {
    if (!(await exists(candidate))) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
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
    const store = getStore();
    const context: Record<string, unknown> = { role: user.role };

    if (user.role === "HOSPITAL") {
      const hospital = await store.getHospitalByUserId(user.id);
      if (hospital) {
        context.hospital = {
          id: hospital.id,
          slug: hospital.slug,
          name: hospital.name,
          city: hospital.city,
          verificationStatus: hospital.verificationStatus,
          verificationNote: hospital.verificationNote,
        };
      }
    }

    if (user.role === "DOCTOR") {
      const doctor = await store.getDoctorByUserId(user.id);
      if (doctor) {
        context.doctor = {
          id: doctor.id,
          slug: doctor.slug,
          verificationStatus: doctor.verificationStatus,
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
    const route = action[0];

    if (route !== "apply-doctor" && route !== "apply-hospital") {
      return fail("Unknown auth action.", 404, "NOT_FOUND");
    }

    const user = await requireSession();
    if (user.role !== "PATIENT") {
      return fail(
        "This account already has a professional role. Contact support to change it.",
        409,
        "ROLE_ALREADY_ASSIGNED"
      );
    }

    const store = getStore();
    const raw: unknown = await req.json().catch(() => null);

    if (route === "apply-doctor") {
      const parsed = applyDoctorSchema.safeParse(raw);
      if (!parsed.success) {
        return fail(
          parsed.error.issues[0]?.message ?? "Invalid application.",
          400,
          "VALIDATION_ERROR"
        );
      }
      const input = parsed.data;

      const specialty = await store.findSpecialtyBySlug(input.specialtySlug);
      if (!specialty) {
        return fail("Selected specialty was not found.", 400, "SPECIALTY_NOT_FOUND");
      }

      const slug = await uniqueSlug(
        slugify(user.name) === "hospital" ? "doctor" : slugify(user.name),
        store.doctorSlugExists.bind(store)
      );

      try {
        const updated = await store.applyDoctorProfile(user.id, {
          specialtyId: specialty.id,
          profile: {
            slug,
            verificationStatus: "PENDING",
            bio: input.bio?.trim() || null,
            experienceYears: input.experienceYears,
            consultationFee: input.consultationFee,
            followUpFee: input.followUpFee,
            videoConsultFee: null,
            regNumber: input.regNumber,
            city: input.city,
            chamberAddress: input.chamberAddress?.trim() || null,
            languages: "bn,en",
            supportsVideo: false,
            requiresApproval: true,
            hospitalId: null,
          },
        });

        await store.createAuditLog({
          actorId: user.id,
          action: "DOCTOR_APPLIED",
          entity: "DoctorProfile",
          entityId: updated.doctorSlug ?? user.id,
          meta: JSON.stringify({
            email: user.email,
            specialtySlug: input.specialtySlug,
            regNumber: input.regNumber,
          }),
        });

        return ok({ user: toSessionUser(updated) }, 201);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Application failed.";
        return fail(message, 409, "APPLICATION_CONFLICT");
      }
    }

    // apply-hospital
    const parsed = applyHospitalSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid application.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;

    const slug = await uniqueSlug(
      slugify(input.hospitalName),
      store.hospitalSlugExists.bind(store)
    );

    try {
      const updated = await store.applyHospitalProfile(user.id, {
        name: input.hospitalName,
        slug,
        city: input.city,
        address: input.address?.trim() || null,
        phone: input.phone?.trim() || user.phone || null,
      });

      await store.createAuditLog({
        actorId: user.id,
        action: "HOSPITAL_APPLIED",
        entity: "Hospital",
        entityId: slug,
        meta: JSON.stringify({
          email: user.email,
          hospitalName: input.hospitalName,
          city: input.city,
        }),
      });

      return ok({ user: toSessionUser(updated) }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Application failed.";
      return fail(message, 409, "APPLICATION_CONFLICT");
    }
  } catch (err) {
    if (err instanceof GuardError) {
      return fail(err.message, err.status, err.code);
    }
    return handleRouteError(err);
  }
}
