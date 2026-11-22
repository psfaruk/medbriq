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
 * POST /api/v1/auth/otp/request  — body { phone }.
 *
 * Sends a LOGIN OTP to a Bangladeshi mobile number. Codes are stored as
 * sha256(phone:purpose:code) digests with a 5-minute expiry; only the newest
 * unconsumed code per (phone, purpose) verifies. Per-phone requests are rate
 * limited (OTP_REQUEST_LIMIT per OTP_REQUEST_WINDOW_MS, shared with
 * forgot-password). In dev mode (console SMS provider) the code is returned
 * as `devCode` so the flow is testable without an SMS provider.
 */

const requestSchema = z.object({
  phone: z.string().trim().min(1, "Phone is required."),
});

export async function POST(req: NextRequest) {
  try {
    const now = Date.now();

    // SECURITY: with the console SMS provider the OTP is echoed back in the
    // response — in production that would let anyone take over any phone
    // number. Refuse phone OTP entirely until a real provider is wired up.
    if (isDevOtpMode() && process.env.NODE_ENV === "production") {
      return fail(
        "Phone sign-in is temporarily unavailable. Please use email or Google.",
        503,
        "OTP_NOT_AVAILABLE"
      );
    }

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

    const code = generateOtpCode();
    const store = getStore();
    await store.createOtpCode({
      phone,
      codeHash: sha256Otp(phone, OTP_PURPOSE.LOGIN, code),
      purpose: OTP_PURPOSE.LOGIN,
      expiresAtIso: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
    });

    await sendOtpSms(phone, code);
    recordOtpRequest(phone, now);

    // Audit trail — never includes the code itself, only its request context.
    await store.createAuditLog({
      actorId: null,
      action: "OTP_REQUESTED",
      entity: "OtpCode",
      entityId: phone,
      meta: JSON.stringify({ phone, purpose: OTP_PURPOSE.LOGIN }),
    });

    return ok(
      {
        sent: true,
        expiresInSeconds: OTP_TTL_SECONDS,
        ...(isDevOtpMode() ? { devCode: code } : {}),
      },
      202
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
