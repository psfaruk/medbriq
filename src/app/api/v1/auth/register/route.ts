import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { LANGUAGES, ROLES } from "@/lib/constants";
import { normalizeBdPhone } from "@/lib/phone";
import { toSessionUser } from "@/app/api/v1/_lib/session-user";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/register
 * PATIENT-FIRST SIGNUP (master prompt §3.1): every account is created as a
 * user/patient — name, DOB, present & permanent address, contact and an
 * explicit terms agreement. Doctors and hospitals do NOT sign up directly:
 * they create this account first, then apply from their dashboard
 * (POST /api/v2/auth/apply-doctor | apply-hospital).
 * The legacy DOCTOR role schema is kept for backward compatibility only.
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

/** ISO "YYYY-MM-DD"; must be a real calendar date, in the past, < 120 years. */
const dobField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return false;
    const now = Date.now();
    if (d.getTime() > now) return false; // future
    return now - d.getTime() < 120 * 365.25 * 24 * 3600 * 1000;
  }, "Enter a valid date of birth.")
  .optional();

const addressField = z
  .string()
  .trim()
  .max(300, "Address must be at most 300 characters.")
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
  dateOfBirth: dobField,
  presentAddress: addressField,
  permanentAddress: addressField,
  agreed: z.literal(true, {
    message: "You must accept the Terms of Service and Privacy Policy.",
  }).optional(),
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

const registerSchema = z.preprocess(
  // Patient-first: a body without "role" (or role "PATIENT") is a patient signup.
  (raw) => {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (obj.role === undefined || obj.role === null || obj.role === "") {
        return { ...obj, role: ROLES.PATIENT };
      }
    }
    return raw;
  },
  z.discriminatedUnion("role", [patientSchema, doctorSchema])
);

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

    // Optional phone: normalized to the canonical BD form (+8801…).
    let phone: string | null = null;
    if (input.phone && input.phone.length > 0) {
      const normalized = normalizeBdPhone(input.phone);
      if (!normalized) {
        return fail(
          "Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX).",
          400,
          "VALIDATION_ERROR"
        );
      }
      phone = normalized;
    }

    // Email uniqueness (application-level; the local DB column is also unique).
    const existing = await store.findUserByEmail(input.email);
    if (existing) {
      return fail(
        "An account with this email already exists.",
        409,
        "EMAIL_TAKEN"
      );
    }

    // Phone uniqueness: OTP login and phone-based password reset resolve
    // accounts BY PHONE — two accounts sharing a number would make the
    // target account unpredictable. Reject the duplicate at the source.
    if (phone) {
      const phoneOwner = await store.findUserByPhone(phone);
      if (phoneOwner) {
        return fail(
          "An account with this phone number already exists.",
          409,
          "PHONE_TAKEN"
        );
      }
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
        phone,
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
      return ok({ user: toSessionUser(user) }, 201);
    }

    // PATIENT (patient-first signup — the only public registration path)
    const user = await store.createPatientUser({
      email: input.email,
      passwordHash,
      name: input.name,
      phone,
      dateOfBirth: input.dateOfBirth ?? null,
      presentAddress: input.presentAddress?.trim() || null,
      permanentAddress: input.permanentAddress?.trim() || null,
    });

    await store.createAuditLog({
      actorId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      meta: JSON.stringify({ email: user.email, role: user.role }),
    });

    await createSession(user.id);
    return ok({ user: toSessionUser(user) }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
