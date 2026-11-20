import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { ok, fail, handleRouteError } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { toSessionUser } from "@/app/api/v1/_lib/session-user";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/login
 * Email + password sign-in with a best-effort in-memory per-IP rate limit
 * (10 attempts / 5 minutes). Always returns a generic 401 on failure so the
 * response cannot be used to enumerate accounts.
 */

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Enter a valid email address." })),
  password: z.string().min(1, "Password is required."),
});

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

type AttemptRecord = { count: number; resetAt: number };
const attemptsByIp = new Map<string, AttemptRecord>();
let lastSweepAt = 0;

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "local";
}

/** Periodic cleanup of expired windows (best-effort MVP rate limiter). */
function sweep(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  for (const [key, record] of attemptsByIp) {
    if (record.resetAt <= now) attemptsByIp.delete(key);
  }
}

export async function POST(req: NextRequest) {
  try {
    const now = Date.now();
    sweep(now);

    const key = clientKey(req);
    const record = attemptsByIp.get(key);
    if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
      return fail(
        "Too many attempts. Try again in a few minutes.",
        429,
        "RATE_LIMITED"
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      // Failed validations count toward the rate limit as well.
      recordFailedAttempt(key, now);
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid input.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const user = await getStore().findUserByEmail(parsed.data.email);

    const passwordOk =
      user !== null && verifyPassword(parsed.data.password, user.passwordHash);
    // Generic failure for unknown email, wrong password, and suspended accounts.
    if (!user || !passwordOk || user.status !== "ACTIVE") {
      recordFailedAttempt(key, now);
      return fail("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    // Successful sign-in clears the throttle for this IP.
    attemptsByIp.delete(key);

    await createSession(user.id);
    return ok({ user: toSessionUser(user) });
  } catch (err) {
    return handleRouteError(err);
  }
}

function recordFailedAttempt(key: string, now: number) {
  const record = attemptsByIp.get(key);
  if (!record || record.resetAt <= now) {
    attemptsByIp.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  record.count += 1;
}
