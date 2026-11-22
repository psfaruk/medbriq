/**
 * Find Medi Doctor SMS provider abstraction (server-side only — imported exclusively
 * by /api/v1 route handlers).
 *
 * Providers:
 *  - "console" / unset → DEV MODE. The OTP is logged server-side and (see the
 *    auth routes) echoed back in the API response as `devCode`, so the whole
 *    phone flow is testable without a paid SMS provider. NEVER enable in
 *    production — the auth routes refuse phone OTP there for exactly that
 *    reason (echoing codes would let anyone take over any phone number).
 *  - "twilio" → real production delivery via the Twilio REST API. Requires
 *    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and SMS_SENDER_ID (a Twilio phone
 *    number, e.g. +1XXXXXXXXXX, or an alphanumeric sender ID where allowed).
 *    Bangladeshi local numbers (01XXXXXXXXX) are converted to E.164
 *    (+8801XXXXXXXXX) automatically.
 *
 * Delivery problems are reported via the returned flag so the calling routes
 * can respond honestly — never pretend an SMS went out.
 */

export function isDevOtpMode(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  return !provider || provider === "console";
}

/**
 * Whether a REAL SMS provider is fully configured (all required credentials
 * present). Used by the auth routes to fail fast and honestly — before any
 * user lookup — when delivery is impossible.
 */
export function isRealProviderConfigured(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "console") return false;
  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.SMS_SENDER_ID?.trim()
    );
  }
  // Unknown provider name — treat as unconfigured until implemented.
  return false;
}

/**
 * Whether phone-OTP sign-in may be OFFERED in the UI at all. Same rule the
 * auth routes enforce: dev-mode codes are only usable outside production,
 * and a selected real provider must have complete credentials.
 */
export function isPhoneOtpSafe(): boolean {
  if (isDevOtpMode()) return process.env.NODE_ENV !== "production";
  return isRealProviderConfigured();
}

/** Convert a Bangladeshi local number (01XXXXXXXXX) to E.164 (+880…). */
function toE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("880")) return "+" + trimmed;
  if (trimmed.startsWith("0")) return "+88" + trimmed;
  return trimmed;
}

/**
 * Deliver an OTP message. Never throws — delivery problems are reported via
 * the returned flag so the calling route can decide how to respond.
 */
export async function sendOtpSms(
  phone: string,
  code: string
): Promise<{ delivered: boolean; reason?: string }> {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();

  if (isDevOtpMode()) {
    // Dev provider: the code is visible in the server log (and, clearly
    // labeled, in the API response) — good enough for local end-to-end tests.
    console.log("fmd-sms] OTP for", phone, ":", code);
    return { delivered: true };
  }

  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const sender = process.env.SMS_SENDER_ID?.trim();
    if (!sid || !authToken || !sender) {
      console.warn(
        "fmd-sms] SMS_PROVIDER=twilio but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / " +
          "SMS_SENDER_ID is missing — OTP for",
        phone,
        "was NOT delivered."
      );
      return { delivered: false, reason: "twilio-not-configured" };
    }

    const to = toE164(phone);
    const body =
      `Your Find Medi Doctor verification code is ${code}. ` +
      `Valid for 5 minutes. Never share this code.`;

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${sid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: sender, Body: body }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (res.ok) {
        return { delivered: true };
      }
      const errText = (await res.text().catch(() => "")).slice(0, 300);
      console.warn(
        `fmd-sms] Twilio send failed (HTTP ${res.status}) for ${to}: ${errText}`
      );
      return { delivered: false, reason: `twilio-http-${res.status}` };
    } catch (err) {
      console.warn("fmd-sms] Twilio request error:", err);
      return { delivered: false, reason: "twilio-network" };
    }
  }

  console.warn(
    `fmd-sms] SMS_PROVIDER "${process.env.SMS_PROVIDER}" is not implemented;` +
      ` OTP for ${phone} was NOT delivered.`
  );
  return { delivered: false, reason: "provider-not-implemented" };
}
