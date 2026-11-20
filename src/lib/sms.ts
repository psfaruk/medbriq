/**
 * Medbriq SMS provider abstraction (server-side only — imported exclusively
 * by /api/v1 route handlers).
 *
 * MVP/dev: SMS_PROVIDER unset or "console" → DEV MODE. The OTP is logged
 * server-side and (see the auth routes) echoed back in the API response as
 * `devCode`, so the whole phone flow is testable without a paid SMS provider.
 * Any other value (e.g. "twilio") is a reserved slot for a real provider;
 * until one is implemented, sends report `{ delivered: false }` so callers can
 * surface an honest "SMS delivery is not configured" state instead of
 * pretending the message went out.
 */

export function isDevOtpMode(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  return !provider || provider === "console";
}

/**
 * Deliver an OTP message. Never throws — delivery problems are reported via
 * the returned flag so the calling route can decide how to respond.
 */
export async function sendOtpSms(
  phone: string,
  code: string
): Promise<{ delivered: boolean }> {
  if (isDevOtpMode()) {
    // Dev provider: the code is visible in the server log (and, clearly
    // labeled, in the API response) — good enough for local end-to-end tests.
    console.log("[medbriq-sms] OTP for", phone, ":", code);
    return { delivered: true };
  }
  console.warn(
    `[medbriq-sms] SMS_PROVIDER "${process.env.SMS_PROVIDER}" is not implemented yet;` +
      ` OTP for ${phone} was NOT delivered.`
  );
  return { delivered: false };
}
