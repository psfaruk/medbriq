import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { normalizeBdPhone } from "@/lib/phone";
import { sendOtpSms, isDevOtpMode } from "@/lib/sms";
import { OTP_PURPOSE, OTP_TTL_SECONDS } from "@/lib/constants";
import {
  generateOtpCode,
  isOtpRateLimited,
  recordOtpRequest,
  sha256Otp,
} from "@/app/api/v1/_lib/otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/forgot-password — body { phone }.
 *
 * Sends a RESET OTP to the phone of an existing account. Enumeration-safe:
 * whether or not a user exists for the phone, the response is the exact same
 * 202 { sent, expiresInSeconds, devCode? } shape, the same rate limit
 * applies, and only the audit/Delivery side effects differ.
 *
 * When no user exists, no code is stored; in dev mode a random 6-digit
 * "chaff" code is returned as devCode instead so the response shape stays
 * indistinguishable — it simply can never verify (see reset-password).
 */

const requestSchema = z.object({
  phone: z.string().trim().min(1, "Phone is required."),
});

export async function POST(req: NextRequest) {
  try {
    const now = Date.now();

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
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

    if (isOtpRateLimited(phone, now)) {
      return fail(
        "Too many code requests. Try again in a few minutes.",
        429,
        "RATE_LIMITED"
      );
    }

    const store = getStore();
    const user = await store.findUserByPhone(phone);

    let devCode: string | undefined;
    if (user) {
      const code = generateOtpCode();
      await store.createOtpCode({
        phone,
        codeHash: sha256Otp(phone, OTP_PURPOSE.RESET, code),
        purpose: OTP_PURPOSE.RESET,
        expiresAtIso: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
      });
      await sendOtpSms(phone, code);
      if (isDevOtpMode()) devCode = code;

      // Audit trail — never includes the code itself.
      await store.createAuditLog({
        actorId: null,
        action: "OTP_REQUESTED",
        entity: "OtpCode",
        entityId: phone,
        meta: JSON.stringify({ phone, purpose: OTP_PURPOSE.RESET }),
      });
    } else if (isDevOtpMode()) {
      // Enumeration-safe chaff: a random code that was never stored, so the
      // dev response is shape-identical but it can never actually verify.
      devCode = generateOtpCode();
    }

    recordOtpRequest(phone, now);

    return ok(
      {
        sent: true,
        expiresInSeconds: OTP_TTL_SECONDS,
        ...(devCode !== undefined ? { devCode } : {}),
      },
      202
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
