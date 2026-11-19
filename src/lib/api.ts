import { NextResponse } from "next/server";

/**
 * Standard Medbriq API response helpers.
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
  console.error("[medbriq-api]", err);
  const message =
    err instanceof Error ? err.message : "Unexpected server error";
  return fail(message, 500, "INTERNAL_ERROR");
}
