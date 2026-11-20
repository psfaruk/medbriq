/**
 * Google Identity Services (GIS) — server-side ID-token verification.
 *
 * The browser GIS button hands us a JWT `credential`. Rather than adding the
 * google-auth-library dependency, we verify it against Google's public
 * tokeninfo endpoint and enforce the same checks ourselves: audience must
 * match GOOGLE_CLIENT_ID (when configured), the email must be verified, and
 * the token must not be expired. Server-side only.
 */

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const FETCH_TIMEOUT_MS = 10_000;

/** Subset of the tokeninfo payload that this module cares about. */
type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
};

export function getGoogleClientId(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return clientId && clientId.length > 0 ? clientId : null;
}

/**
 * Verify a GIS ID token (`credential` from the browser button).
 * Returns the verified identity, or null when the token is invalid, expired,
 * issued for another app, or the check could not be completed (network error
 * / timeout). Callers treat every null the same way — no detail leaks.
 */
export async function verifyGoogleIdToken(
  credential: string
): Promise<{ email: string; name: string; picture: string | null } | null> {
  try {
    const res = await fetch(
      `${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
    );
    if (!res.ok) return null;

    const payload = (await res.json()) as GoogleTokenInfo;

    // Audience: must match this deployment's client id (skipped only when no
    // client id is configured, so local experiments still work).
    const clientId = getGoogleClientId();
    if (clientId && payload.aud !== clientId) return null;

    // Google must vouch for the email address.
    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";
    if (!emailVerified) return null;
    if (!payload.email || typeof payload.email !== "string") return null;

    // Expiry: tokeninfo returns exp as a string of epoch seconds.
    const exp = Number(payload.exp);
    if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return null;

    const email = payload.email.toLowerCase();
    return {
      email,
      name: payload.name || email.split("@")[0] || "Google user",
      picture: payload.picture ?? null,
    };
  } catch {
    // Timeouts, network failures, malformed payloads — uniformly "no".
    return null;
  }
}
