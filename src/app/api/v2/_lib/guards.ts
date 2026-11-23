import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { storeKind } from "@/lib/data";
import type { SessionUser } from "@/lib/types";

/**
 * Shared server-side guards for /api/v2 routes.
 *
 * v2 routes talk to Prisma directly (the v1 dual-store DataStore abstraction
 * stays untouched for the booking engine). Guards here enforce the same
 * role separation rules as v1 (docs/ARCHITECTURE_CORRECTIONS.md #7):
 * patients, doctors, hospitals and admins only ever see their own data.
 */

export class GuardError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Split-brain guard: v2 routes bypass the DataStore and query Prisma/SQLite
 * directly. When the active store is Firestore (production), those routes
 * would read/write the Vercel demo SQLite instead of production data while
 * auth resolves against Firestore — two databases disagreeing in one
 * request. Like the VVS module's requireVvsStore, these routes answer
 * 503 MODULE_DISABLED on the Firestore path (docs/ARCHITECTURE_CORRECTIONS.md
 * #2 eligibility control) instead of silently splitting.
 */
export function requirePrismaBackedStore(): void {
  if (storeKind() !== "prisma") {
    throw new GuardError(
      "This surface requires the Prisma-backed store (demo/dev mode) — it bypasses the DataStore contract. It is disabled in Firestore and hybrid production modes pending the Phase 0 data-residency review — docs/ARCHITECTURE_CORRECTIONS.md #5.",
      503,
      "MODULE_DISABLED"
    );
  }
}

/** Require any authenticated session or throw 401. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new GuardError("Sign in required.", 401, "UNAUTHORIZED");
  }
  return user;
}

/** Require a specific role (or one of a set) or throw 403. */
export async function requireRole(
  ...roles: string[]
): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new GuardError(
      "You do not have permission to perform this action.",
      403,
      "FORBIDDEN"
    );
  }
  return user;
}

/** The signed-in doctor's DoctorProfile (doctors can book as patients too). */
export async function requireDoctorProfile() {
  requirePrismaBackedStore(); // this surface queries Prisma directly
  const user = await requireRole("DOCTOR");
  const profile = await db.doctorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    throw new GuardError(
      "Doctor profile not found for this account.",
      404,
      "NOT_FOUND"
    );
  }
  return { user, profile };
}

/** The signed-in hospital manager's Hospital profile. */
export async function requireHospitalProfile() {
  requirePrismaBackedStore(); // this surface queries Prisma directly
  const user = await requireRole("HOSPITAL");
  const hospital = await db.hospital.findUnique({
    where: { userId: user.id },
  });
  if (!hospital) {
    throw new GuardError(
      "Hospital profile not found for this account.",
      404,
      "NOT_FOUND"
    );
  }
  return { user, hospital };
}

/** Read a runtime feature flag (default false when missing). */
export async function featureEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? false;
}

/** Read a platform setting value. */
export async function platformSetting(
  key: string,
  fallback: string
): Promise<string> {
  const row = await db.platformSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}
