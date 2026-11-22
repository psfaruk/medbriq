/**
 * Google sign-in — server-side ID-token verification.
 *
 * Two verification paths, tried in order:
 *
 *  1. PRODUCTION (default): the client uses the Firebase Auth JS SDK
 *     (signInWithPopup + GoogleAuthProvider) and sends the resulting
 *     Firebase ID token. We verify it with firebase-admin using the
 *     FIREBASE_SERVICE_ACCOUNT credentials — audience (our project),
 *     issuer, expiry and email-verified flags are all checked by the
 *     Admin SDK itself. Requires the Google sign-in provider to be
 *     enabled in the Firebase console.
 *
 *  2. FALLBACK (local experiments): a Google Identity Services (GIS)
 *     JWT is verified against Google's public tokeninfo endpoint, with
 *     the audience enforced against GOOGLE_CLIENT_ID when configured.
 *
 * Server-side only.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { parseServiceAccountEnv } from "@/lib/data/firestore-store";

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

/** Google sign-in works when EITHER the service account (Firebase Auth) or an explicit GIS client id is configured. */
export function isGoogleAuthConfigured(): boolean {
  return parseServiceAccountEnv() !== null || getGoogleClientId() !== null;
}

/** Get (or lazily create) the firebase-admin app instance for Auth. */
function getAdminApp() {
  const serviceAccount = parseServiceAccountEnv();
  if (!serviceAccount) return null;
  return (
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    })
  );
}

/** Verified Google identity — provider-agnostic shape used by the auth route. */
export interface GoogleIdentity {
  email: string;
  name: string;
  picture: string | null;
}

/** Path 1: Firebase Auth ID token, verified with the Admin SDK. */
async function verifyFirebaseIdToken(
  credential: string
): Promise<GoogleIdentity | null> {
  const app = getAdminApp();
  if (!app) return null;
  try {
    const decoded = await getAuth(app).verifyIdToken(credential, true);
    // Only accept tokens minted for a Google sign-in (not phone/password
    // sessions that might leak through the same endpoint).
    const provider =
      (decoded.firebase as { sign_in_provider?: string } | undefined)
        ?.sign_in_provider ?? "google.com";
    if (provider !== "google.com") return null;
    if (!decoded.email) return null;
    if (decoded.email_verified !== true) return null;
    const email = decoded.email.toLowerCase();
    return {
      email,
      name: decoded.name || email.split("@")[0] || "Google user",
      picture: decoded.picture ?? null,
    };
  } catch {
    // Invalid, expired, wrong audience/project — uniformly "no".
    return null;
  }
}

/** Path 2: GIS JWT, verified against Google's public tokeninfo endpoint. */
async function verifyTokeninfoJwt(
  credential: string
): Promise<GoogleIdentity | null> {
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

/**
 * Verify a Google credential (`credential` from the browser — either a
 * Firebase ID token or a GIS JWT). Returns the verified identity, or null
 * when the token is invalid, expired, issued for another app, or no
 * verification path is available. Callers treat every null the same way —
 * no detail leaks.
 */
export async function verifyGoogleIdToken(
  credential: string
): Promise<GoogleIdentity | null> {
  // Try the Firebase Admin path first (production). When there is no
  // service account the admin verifier returns null immediately.
  const viaFirebase = await verifyFirebaseIdToken(credential);
  if (viaFirebase) return viaFirebase;
  // Fall back to the GIS tokeninfo path.
  return verifyTokeninfoJwt(credential);
}
