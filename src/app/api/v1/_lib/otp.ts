import { createHash, randomInt, timingSafeEqual } from "crypto";
import type { DataStore } from "@/lib/data/types";
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_REQUEST_LIMIT,
  OTP_REQUEST_WINDOW_MS,
} from "@/lib/constants";

/**
 * Shared server-side helpers for the phone-OTP flows
 * (/api/v1/auth/otp/*, /api/v1/auth/forgot-password, /api/v1/auth/reset-password).
 *
 * Codes are stored ONLY as sha256(`${phone}:${purpose}:${code}`) digests; the
 * plaintext code exists ephemerally in the request that generated it and in
 * the SMS delivery call. Comparison is timing-safe (both sides are
 * fixed-length hex digests).
 */

/** sha256 hex digest of the canonical "phone:purpose:code" string. */
export function sha256Otp(phone: string, purpose: string, code: string): string {
  return createHash("sha256")
    .update(`${phone}:${purpose}:${code}`)
    .digest("hex");
}

/** Timing-safe comparison of two OTP hashes (equal-length hex digests). */
export function otpHashMatches(candidate: string, stored: string): boolean {
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(stored, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Cryptographically random, zero-padded 6-digit OTP code. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

// ── Per-phone request rate limiting (in-memory, best-effort MVP) ──────────
// Shared by the LOGIN and RESET request endpoints so a phone cannot multiply
// its quota by alternating between them. Sliding window of timestamps with a
// periodic sweep, mirroring the login route's per-IP limiter.

const otpRequestsByPhone = new Map<string, number[]>();
const SWEEP_INTERVAL_MS = 60 * 1000;
let lastSweepAt = 0;

function recentRequests(phone: string, now: number): number[] {
  const horizon = now - OTP_REQUEST_WINDOW_MS;
  return (otpRequestsByPhone.get(phone) ?? []).filter((t) => t > horizon);
}

/** Periodic cleanup of expired windows (best-effort MVP rate limiter). */
function sweep(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  const horizon = now - OTP_REQUEST_WINDOW_MS;
  for (const [phone, timestamps] of otpRequestsByPhone) {
    const alive = timestamps.filter((t) => t > horizon);
    if (alive.length === 0) otpRequestsByPhone.delete(phone);
    else otpRequestsByPhone.set(phone, alive);
  }
}

/** True when the phone already used its OTP_REQUEST_LIMIT quota in the window. */
export function isOtpRateLimited(phone: string, now: number): boolean {
  sweep(now);
  return recentRequests(phone, now).length >= OTP_REQUEST_LIMIT;
}

/** Record one (accepted) OTP request in the per-phone sliding window. */
export function recordOtpRequest(phone: string, now: number): void {
  sweep(now);
  const recent = recentRequests(phone, now);
  recent.push(now);
  otpRequestsByPhone.set(phone, recent);
}

// ── Code verification (shared by otp/verify and reset-password) ───────────

export type OtpCheck =
  | { outcome: "valid" }
  | { outcome: "missing" }
  | { outcome: "locked" }
  | { outcome: "incorrect"; attemptsLeft: number };

/**
 * Verify a submitted code against the active code for (phone, purpose).
 * On success the code is consumed (single use); on mismatch the attempt
 * counter is incremented and the remaining attempts are reported.
 */
export async function checkOtpCode(
  store: DataStore,
  phone: string,
  purpose: string,
  code: string
): Promise<OtpCheck> {
  const active = await store.findActiveOtpCode(phone, purpose);
  if (!active) return { outcome: "missing" };
  if (active.attempts >= OTP_MAX_ATTEMPTS) return { outcome: "locked" };

  if (!otpHashMatches(sha256Otp(phone, purpose, code), active.codeHash)) {
    await store.incrementOtpAttempts(active.id);
    return {
      outcome: "incorrect",
      attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - active.attempts - 1),
    };
  }

  await store.consumeOtpCode(active.id);
  return { outcome: "valid" };
}
