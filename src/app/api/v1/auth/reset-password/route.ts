import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { normalizeBdPhone } from "@/lib/phone";
import { OTP_LENGTH, OTP_PURPOSE } from "@/lib/constants";
import { checkOtpCode } from "@/app/api/v1/_lib/otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/reset-password — body { phone, code, newPassword }.
 *
 * Completes the forgot-password flow: verifies the active RESET code for the
 * phone (same attempt limiting as the login OTP) and replaces the password.
 */

const resetSchema = z.object({
  phone: z.string().trim().min(1, "Phone is required."),
  code: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_LENGTH}}$`),
      `Enter the ${OTP_LENGTH}-digit code sent to your phone.`
    ),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be at most 100 characters."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);
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
      OTP_PURPOSE.RESET,
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

    // Valid code (consumed above) — the account must exist for a stored code,
    // but guard anyway (also covers the dev-mode chaff path).
    const user = await store.findUserByPhone(phone);
    if (!user) {
      return fail("Code expired or not found.", 400, "INVALID_CODE");
    }

    await store.updateUserPassword(user.id, hashPassword(parsed.data.newPassword));

    await store.createAuditLog({
      actorId: user.id,
      action: "PASSWORD_RESET",
      entity: "User",
      entityId: user.id,
      meta: JSON.stringify({ phone }),
    });

    return ok({ changed: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
