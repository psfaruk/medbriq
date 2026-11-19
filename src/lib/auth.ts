import "server-only";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  ROLES,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  type Role,
} from "@/lib/constants";

/**
 * Medbriq authentication (server-side only).
 *
 * Strategy for the MVP:
 * - Passwords hashed with scrypt (Node built-in; no external dependency).
 * - Opaque session tokens stored in the Session table, referenced by an
 *   httpOnly cookie. Tokens are random UUIDs — no JWT secrets to leak.
 * - Every request re-validates the session against the database so that
 *   logout / revocation is immediate.
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

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await db.session.create({ data: { token, userId, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  doctorSlug: string | null;
  verificationStatus: string | null;
};

/**
 * Resolve the current user from the session cookie.
 * Returns null for guests, expired sessions, or suspended accounts.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { doctorProfile: { select: { slug: true, verificationStatus: true } } },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as Role,
    doctorSlug: session.user.doctorProfile?.slug ?? null,
    verificationStatus: session.user.doctorProfile?.verificationStatus ?? null,
  };
}

/**
 * Guard for API routes: returns the user when authenticated (and, when
 * `roles` is provided, authorized), otherwise null.
 */
export async function requireUser(
  ...roles: Role[]
): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles.length > 0 && !roles.includes(user.role)) return null;
  return user;
}

export { ROLES };
