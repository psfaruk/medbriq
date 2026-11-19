import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { LANGUAGES, ROLES } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/register
 * Creates a PATIENT or DOCTOR account. Doctor accounts additionally receive a
 * DoctorProfile (verificationStatus "PENDING") linked to their specialty.
 * The new user is signed in automatically (session cookie set on success).
 */

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address." }));

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password must be at most 100 characters.");

const nameField = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be at most 80 characters.");

const phoneField = z
  .string()
  .trim()
  .max(20, "Phone must be at most 20 characters.")
  .optional();

/** Accepts "bn,en" or ["bn","en"]; returns comma-joined known codes. */
function normalizeLanguages(
  input: string | string[] | undefined | null
): string {
  if (!input) return "bn,en";
  const codes = (Array.isArray(input) ? input : input.split(","))
    .map((c) => c.trim())
    .filter(Boolean);
  const valid = codes.filter((c) => c in LANGUAGES);
  return valid.length > 0 ? valid.join(",") : "bn,en";
}

const patientSchema = z.object({
  role: z.literal(ROLES.PATIENT),
  email: emailField,
  password: passwordField,
  name: nameField,
  phone: phoneField,
});

const doctorSchema = z.object({
  role: z.literal(ROLES.DOCTOR),
  email: emailField,
  password: passwordField,
  name: nameField,
  phone: phoneField,
  specialtySlug: z.string().trim().min(1, "Select a specialty."),
  regNumber: z
    .string()
    .trim()
    .min(3, "Registration number must be at least 3 characters.")
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
  languages: z.union([z.string(), z.array(z.string())]).optional(),
  supportsVideo: z.boolean().optional().default(false),
  requiresApproval: z.boolean().optional().default(true),
});

const registerSchema = z.discriminatedUnion("role", [
  patientSchema,
  doctorSchema,
]);

/** lowercase, non-alphanumeric runs -> "-", edges trimmed; fallback "doctor". */
function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "doctor";
}

/** Appends "-2", "-3", ... until the slug is free. */
async function uniqueDoctorSlug(base: string): Promise<string> {
  const store = getStore();
  let candidate = base;
  let counter = 2;
  // Bounded loop; a timestamp suffix is the (practically unreachable) escape hatch.
  while (counter < 300) {
    if (!(await store.doctorSlugExists(candidate))) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid registration data.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const input = parsed.data;
    const store = getStore();

    // Email uniqueness (application-level; the local DB column is also unique).
    const existing = await store.findUserByEmail(input.email);
    if (existing) {
      return fail(
        "An account with this email already exists.",
        409,
        "EMAIL_TAKEN"
      );
    }

    const passwordHash = hashPassword(input.password);

    if (input.role === ROLES.DOCTOR) {
      // Validate the specialty before creating any rows.
      const specialty = await store.findSpecialtyBySlug(input.specialtySlug);
      if (!specialty) {
        return fail(
          "Selected specialty was not found.",
          400,
          "SPECIALTY_NOT_FOUND"
        );
      }

      const slug = await uniqueDoctorSlug(slugifyName(input.name));
      const user = await store.createDoctorAccount({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone ?? null,
        specialtyId: specialty.id,
        profile: {
          slug,
          verificationStatus: "PENDING",
          bio: input.bio ?? null,
          experienceYears: input.experienceYears,
          consultationFee: input.consultationFee,
          followUpFee: input.followUpFee,
          videoConsultFee: null,
          regNumber: input.regNumber,
          city: input.city,
          chamberAddress: input.chamberAddress ?? null,
          languages: normalizeLanguages(input.languages),
          supportsVideo: input.supportsVideo,
          requiresApproval: input.requiresApproval,
          hospitalId: null,
        },
      });

      await store.createAuditLog({
        actorId: user.id,
        action: "DOCTOR_REGISTERED",
        entity: "User",
        entityId: user.id,
        meta: JSON.stringify({
          email: user.email,
          role: user.role,
          doctorSlug: user.doctorSlug ?? null,
          specialtySlug: input.specialtySlug,
        }),
      });

      await createSession(user.id);
      const sessionUser: SessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as SessionUser["role"],
        doctorSlug: user.doctorSlug ?? null,
        verificationStatus: user.verificationStatus ?? null,
      };
      return ok({ user: sessionUser }, 201);
    }

    // PATIENT
    const user = await store.createPatientUser({
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone ?? null,
    });

    await store.createAuditLog({
      actorId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      meta: JSON.stringify({ email: user.email, role: user.role }),
    });

    await createSession(user.id);
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as SessionUser["role"],
      doctorSlug: null,
      verificationStatus: null,
    };
    return ok({ user: sessionUser }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
