import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Medbriq password hashing (pure module — no Next.js imports).
 *
 * Extracted from src/lib/auth.ts so that standalone scripts (prisma/seed.ts,
 * scripts/firestore-seed.ts) can reuse the exact same hashing without pulling
 * in "server-only" / "next/headers".
 *
 * Strategy: scrypt (Node built-in), 16-byte hex salt, 64-byte key, stored as
 * "salt:hash". Verification is constant-time.
 */

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
