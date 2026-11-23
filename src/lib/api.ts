import { NextResponse } from "next/server";
import { ModuleDisabledError } from "@/lib/modules";
import {
  FeeModuleUnavailableError,
  StatusTransitionError,
} from "@/lib/data/types";

/**
 * Standard Find Medi Doctor API response helpers.
 * Success: { ok: true, data }
 * Failure: { ok: false, error: { message, code } }
 */

export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json({ ok: true, data }, responseInit);
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { ok: false, error: { message, code: code ?? `HTTP_${status}` } },
    { status }
  );
}

/**
 * Failure response with a structured extra payload (e.g. the fresh price
 * breakdown on 409 PRICE_CHANGED, so the client can recover without a
 * second round-trip).
 */
export function failWith<T extends Record<string, unknown>>(
  message: string,
  status: number,
  code: string,
  extra: T
) {
  return NextResponse.json(
    { ok: false, error: { message, code, ...extra } },
    { status }
  );
}

export function handleRouteError(err: unknown) {
  // Module eligibility gates (docs/ARCHITECTURE_CORRECTIONS.md #2/#18):
  // disabled modules answer 503 with the gate reason, never a silent 404/500.
  if (err instanceof ModuleDisabledError) {
    return fail(err.message, 503, "MODULE_DISABLED");
  }
  if (err instanceof FeeModuleUnavailableError) {
    return fail(err.message, 503, "MODULE_DISABLED");
  }
  // Conditional status transitions: a concurrent actor changed the entity
  // first — the client should refresh and retry, not treat it as a crash.
  if (err instanceof StatusTransitionError) {
    return fail(err.message, 409, "STATUS_CHANGED");
  }
  // Log the real error server-side, but never leak internal messages (raw
  // Prisma/OS error text, stack fragments) to the client.
  console.error("[mfmd-api]", err);
  return fail(
    "Something went wrong on our side. Please try again.",
    500,
    "INTERNAL_ERROR"
  );
}
