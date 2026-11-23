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
 *  - "sslwireless" → Bangladesh-local aggregator (smsplus.sslwireless.com).
 *    Requires SSLWIRELESS_API_TOKEN, SSLWIRELESS_SID and SMS_SENDER_ID.
 *    Usually the cheapest option for BD local numbers.
 *  - "twilio" → international delivery via the Twilio REST API. Requires
 *    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and SMS_SENDER_ID (a Twilio phone
 *    number, e.g. +1XXXXXXXXXX, or an alphanumeric sender ID where allowed).
 *
 * Bangladeshi local numbers (01XXXXXXXXX) are converted to E.164 (+880…) for
 * Twilio, and to the bare international form (880…) for SSL Wireless.
 *
 * Delivery problems are reported via the returned flag so the calling routes
 * can respond honestly — never pretend an SMS went out.
 */

export function isDevOtpMode(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  return !provider || provider === "console";
}

/** Credential keys each provider needs, in the order they are reported. */
const PROVIDER_KEYS: Record<string, string[]> = {
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "SMS_SENDER_ID"],
  sslwireless: ["SSLWIRELESS_API_TOKEN", "SSLWIRELESS_SID", "SMS_SENDER_ID"],
};

/** Names of the provider keys that are currently missing (never their values). */
export function missingProviderKeys(provider: string): string[] {
  const keys = PROVIDER_KEYS[provider] ?? [];
  return keys.filter((k) => !process.env[k]?.trim());
}

/**
 * Whether a REAL SMS provider is fully configured (all required credentials
 * present). Used by the auth routes to fail fast and honestly — before any
 * user lookup — when delivery is impossible.
 */
export function isRealProviderConfigured(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "console") return false;
  if (provider in PROVIDER_KEYS) return missingProviderKeys(provider).length === 0;
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

/** Bare international form (880…) — what SSL Wireless expects in `msisdn`. */
function toBareInternational(phone: string): string {
  return toE164(phone).replace(/^\+/, "");
}

const OTP_BODY = (code: string) =>
  `Your Find Medi Doctor verification code is ${code}. ` +
  `Valid for 5 minutes. Never share this code.`;

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

  const missing = missingProviderKeys(provider);
  if (missing.length > 0) {
    console.warn(
      `fmd-sms] SMS_PROVIDER=${provider} but ${missing.join(" / ")} is missing — ` +
        `OTP for ${phone} was NOT delivered.`
    );
    return { delivered: false, reason: "provider-not-configured" };
  }

  // ── SSL Wireless (Bangladesh) ────────────────────────────────────────
  if (provider === "sslwireless") {
    const to = toBareInternational(phone);
    // csms_id is the client-side message id SSL Wireless echoes back; it only
    // needs to be unique per attempt.
    const csmsId = Math.floor(Math.random() * 1_000_000_000);
    try {
      const res = await fetch("https://smsplus.sslwireless.com/api/v3/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          api_token: process.env.SSLWIRELESS_API_TOKEN?.trim(),
          sid: process.env.SSLWIRELESS_SID?.trim(),
          msisdn: to,
          sms_body: OTP_BODY(code),
          csms_id: csmsId,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        return { delivered: true };
      }
      const errText = (await res.text().catch(() => "")).slice(0, 300);
      console.warn(
        `fmd-sms] SSL Wireless send failed (HTTP ${res.status}) for ${to}: ${errText}`
      );
      return { delivered: false, reason: `sslwireless-http-${res.status}` };
    } catch (err) {
      console.warn("fmd-sms] SSL Wireless request error:", err);
      return { delivered: false, reason: "sslwireless-network" };
    }
  }

  // ── Twilio ───────────────────────────────────────────────────────────
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const sender = process.env.SMS_SENDER_ID?.trim();
    const to = toE164(phone);

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid ?? "")}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${sid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: sender ?? "", Body: OTP_BODY(code) }),
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
