import "server-only";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getStore } from "@/lib/data";
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
 * - Passwords hashed with scrypt (Node built-in; no external dependency) —
 *   see src/lib/password.ts (pure module, shared with the seeders).
 * - Opaque session tokens stored via the active DataStore (Prisma/SQLite
 *   locally, Firestore in production), referenced by an httpOnly cookie.
 *   Tokens are random UUIDs — no JWT secrets to leak.
 * - Every request re-validates the session against the database so that
 *   logout / revocation is immediate.
 */

export { hashPassword, verifyPassword } from "@/lib/password";

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await getStore().createSession(token, userId, expiresAt.toISOString());
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
    await getStore().deleteSessionsByToken(token);
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

  const store = getStore();
  const session = await store.getSessionUser(token);

  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await store.deleteSessionById(session.id).catch(() => {});
    return null;
  }
  if (session.user.status !== "ACTIVE") return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as Role,
    doctorSlug: session.user.doctorSlug,
    verificationStatus: session.user.verificationStatus,
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
