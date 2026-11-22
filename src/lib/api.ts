import { NextResponse } from "next/server";
import { ModuleDisabledError } from "@/lib/modules";
import { FeeModuleUnavailableError } from "@/lib/data/types";

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

export function handleRouteError(err: unknown) {
  // Module eligibility gates (docs/ARCHITECTURE_CORRECTIONS.md #2/#18):
  // disabled modules answer 503 with the gate reason, never a silent 404/500.
  if (err instanceof ModuleDisabledError) {
    return fail(err.message, 503, "MODULE_DISABLED");
  }
  if (err instanceof FeeModuleUnavailableError) {
    return fail(err.message, 503, "MODULE_DISABLED");
  }
  console.error("[mfmd-api]", err);
  const message =
    err instanceof Error ? err.message : "Unexpected server error";
  return fail(message, 500, "INTERNAL_ERROR");
}
