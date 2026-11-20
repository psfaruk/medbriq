import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { normalizeBdPhone } from "@/lib/phone";
import { OTP_LENGTH, OTP_PURPOSE } from "@/lib/constants";
import { checkOtpCode } from "@/app/api/v1/_lib/otp";
import { toSessionUser } from "@/app/api/v1/_lib/session-user";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/otp/verify — body { phone, code, name? }.
 *
 * Completes a phone-OTP login. An existing account with that phone is signed
 * in (a successful OTP proves phone ownership, so phoneVerified is set); an
 * unknown phone creates a new PATIENT account with a deterministic synthetic
 * email. Wrong codes are rate limited per code (OTP_MAX_ATTEMPTS).
 */

const verifySchema = z.object({
  phone: z.string().trim().min(1, "Phone is required."),
  code: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_LENGTH}}$`),
      `Enter the ${OTP_LENGTH}-digit code sent to your phone.`
    ),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be at most 80 characters.")
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const phone = normalizeBdPhone(parsed.data.phone);
    if (!phone) {
      return fail(
        "Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX).",
        400,
        "VALIDATION_ERROR"
      );
    }

    const store = getStore();
    const check = await checkOtpCode(
      store,
      phone,
      OTP_PURPOSE.LOGIN,
      parsed.data.code
    );
    if (check.outcome === "missing") {
      return fail(
        "Code expired or not found. Request a new code.",
        400,
        "INVALID_CODE"
      );
    }
    if (check.outcome === "locked") {
      return fail(
        "Too many incorrect attempts. Request a new code.",
        429,
        "TOO_MANY_ATTEMPTS"
      );
    }
    if (check.outcome === "incorrect") {
      return fail(
        `Incorrect code. ${check.attemptsLeft} attempt(s) left.`,
        400,
        "INVALID_CODE"
      );
    }

    // Valid code (consumed above) — sign in or register.
    const existing = await store.findUserByPhone(phone);
    if (existing) {
      if (existing.status !== "ACTIVE") {
        return fail(
          "This account is not available. Please contact support if you believe this is a mistake.",
          403,
          "ACCOUNT_SUSPENDED"
        );
      }
      // A successful OTP proves ownership of the phone number.
      await store.setUserPhoneVerified(existing.id).catch(() => {});
      await createSession(existing.id);
      return ok({
        user: toSessionUser({ ...existing, phoneVerified: true }),
        isNewAccount: false,
      });
    }

    const name = parsed.data.name ?? `Guest ${phone.slice(-4)}`;
    const email = `p_${phone.replace("+", "")}@phone.medbriq.dev`;
    const { user, created } = await store.findOrCreatePhoneUser({
      phone,
      name,
      email,
    });

    if (created) {
      await store.createAuditLog({
        actorId: user.id,
        action: "USER_REGISTERED",
        entity: "User",
        entityId: user.id,
        meta: JSON.stringify({ provider: "phone", phone }),
      });
    }

    await createSession(user.id);
    return ok({ user: toSessionUser(user), isNewAccount: created });
  } catch (err) {
    return handleRouteError(err);
  }
}
