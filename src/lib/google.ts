/**
 * Google sign-in — server-side ID-token verification.
 *
 * Two verification paths, tried in order:
 *
 *  1. PRODUCTION (default): the client uses the Firebase Auth JS SDK
 *     (signInWithPopup + GoogleAuthProvider) and sends the resulting
 *     Firebase ID token. We verify the JWT ourselves against Google's
 *     public securetoken certificates (RS256 signature, issuer
 *     https://securetoken.google.com/<projectId>, audience = project id,
 *     expiry, email verified) using node:crypto — deliberately NOT
 *     firebase-admin/auth, whose jwks-rsa/jose chain breaks in the
 *     serverless bundle (ERR_REQUIRE_ESM). Requires the Google sign-in
 *     provider to be enabled in the Firebase console.
 *
 *  2. FALLBACK (local experiments): a Google Identity Services (GIS)
 *     JWT is verified against Google's public tokeninfo endpoint, with
 *     the audience enforced against GOOGLE_CLIENT_ID when configured.
 *
 * Server-side only.
 */

import { createPublicKey, createVerify } from "crypto";
import { parseServiceAccountEnv } from "@/lib/data/firestore-store";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const SECURETOKEN_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const FETCH_TIMEOUT_MS = 10_000;

/** Cert cache (Google rotates keys every ~few weeks; respect max-age). */
let certsCache: { keys: Record<string, string>; fetchedAt: number; maxAgeMs: number } | null =
  null;

async function getSecureTokenCerts(): Promise<Record<string, string> | null> {
  const now = Date.now();
  if (certsCache && now - certsCache.fetchedAt < certsCache.maxAgeMs) {
    return certsCache.keys;
  }
  try {
    const res = await fetch(SECURETOKEN_CERTS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const cacheControl = res.headers.get("cache-control") ?? "";
    const maxAge = /max-age=(\d+)/.exec(cacheControl)?.[1];
    const keys = (await res.json()) as Record<string, string>;
    certsCache = {
      keys,
      fetchedAt: now,
      maxAgeMs: maxAge ? Math.min(Number(maxAge) * 1000, 6 * 60 * 60 * 1000) : 60 * 60 * 1000,
    };
    return keys;
  } catch {
    return null;
  }
}

/** Subset of the tokeninfo payload that this module cares about. */
type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
};

/** Fields of a decoded Firebase ID token we verify. */
type FirebaseIdToken = {
  header: { alg?: string; kid?: string };
  payload: {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    firebase?: { sign_in_provider?: string };
  };
  rawHeader: string;
  rawPayload: string;
  signature: Buffer;
};

function decodeJwt(credential: string): FirebaseIdToken | null {
  try {
    const parts = credential.split(".");
    if (parts.length !== 3) return null;
    const rawHeader = parts[0];
    const rawPayload = parts[1];
    // accept both Buffer and url-safe base64
    const header = JSON.parse(
      Buffer.from(rawHeader, "base64url").toString("utf8")
    ) as FirebaseIdToken["header"];
    const payload = JSON.parse(
      Buffer.from(rawPayload, "base64url").toString("utf8")
    ) as FirebaseIdToken["payload"];
    const signature = Buffer.from(parts[2], "base64url");
    return { header, payload, rawHeader, rawPayload, signature };
  } catch {
    return null;
  }
}

export function getGoogleClientId(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return clientId && clientId.length > 0 ? clientId : null;
}

/** Google sign-in works when the Firebase project is known (service account OR public web config) or an explicit GIS client id is configured. */
export function isGoogleAuthConfigured(): boolean {
  return serviceAccountProjectId() !== null || getGoogleClientId() !== null;
}

/** Verified Google identity — provider-agnostic shape used by the auth route. */
export interface GoogleIdentity {
  email: string;
  name: string;
  picture: string | null;
}

/**
 * The Firebase project id that Google-issued ID tokens must be bound to
 * (issuer + audience). Prefer the service account's project_id; but in
 * Prisma/PostgreSQL deployments FIREBASE_SERVICE_ACCOUNT must stay unset
 * (setting it flips the data store to Firestore mode), so fall back to the
 * public web config's project id — same value, same audience check.
 */
function serviceAccountProjectId(): string | null {
  const sa = parseServiceAccountEnv() as { project_id?: string } | null;
  if (sa?.project_id) return sa.project_id;
  const webPid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  return webPid ? webPid : null;
}

/**
 * Path 1: Firebase Auth ID token, verified against Google's public
 * securetoken certificates (the same keys firebase-admin uses).
 */
async function verifyFirebaseIdToken(
  credential: string
): Promise<GoogleIdentity | null> {
  const projectId = serviceAccountProjectId();
  if (!projectId) return null;

  const decoded = decodeJwt(credential);
  if (!decoded) return null;
  // RS256 is the only algorithm Firebase issues — reject anything else
  // (prevents algorithm-confusion attacks).
  if (decoded.header.alg !== "RS256" || !decoded.header.kid) return null;

  // Standard claims firebase-admin also enforces.
  const { payload } = decoded;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (payload.aud !== projectId) return null;
  if (!payload.sub || payload.sub.length > 128) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;

  // Only accept tokens minted for a Google sign-in (not phone/password
  // sessions that might leak through the same endpoint).
  if (payload.firebase?.sign_in_provider !== "google.com") return null;
  if (payload.email_verified !== true) return null;
  if (!payload.email || typeof payload.email !== "string") return null;

  // Verify the RS256 signature with the matching public certificate.
  const certs = await getSecureTokenCerts();
  if (!certs) return null;
  const certPem = certs[decoded.header.kid];
  if (!certPem) return null;
  try {
    const publicKey = createPublicKey(certPem);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${decoded.rawHeader}.${decoded.rawPayload}`);
    if (!verifier.verify(publicKey, decoded.signature)) return null;
  } catch {
    return null;
  }

  const email = payload.email.toLowerCase();
  return {
    email,
    name: payload.name || email.split("@")[0] || "Google user",
    picture: payload.picture ?? null,
  };
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
  // Try the Firebase securetoken path first (production). When there is
  // no service account it returns null immediately.
  const viaFirebase = await verifyFirebaseIdToken(credential);
  if (viaFirebase) return viaFirebase;
  // Fall back to the GIS tokeninfo path.
  return verifyTokeninfoJwt(credential);
}
