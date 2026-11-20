"use client";

/**
 * Shared client helpers for the Medbriq API envelope:
 *   { ok: true, data } | { ok: false, error: { message, code } }
 *
 * Extracted from the patterns in src/components/views/auth-view.tsx so new
 * components (notification bell, settings view, ...) can share one copy.
 */

export class ApiCallError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(message: string, code: string | null, status: number) {
    super(message);
    this.name = "ApiCallError";
    this.code = code;
    this.status = status;
  }
}

export function isApiSuccess(v: unknown): v is { ok: true; data: unknown } {
  return (
    typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true
  );
}

export function isApiError(
  v: unknown
): v is { ok: false; error: { message: string; code: string } } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { ok?: unknown }).ok === false &&
    typeof (v as { error?: { message?: unknown } }).error?.message === "string"
  );
}

async function requestJson(
  url: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(url, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || !isApiSuccess(json)) {
    const message = isApiError(json)
      ? json.error.message
      : "Something went wrong. Try again.";
    const code = isApiError(json) ? json.error.code : null;
    throw new ApiCallError(message, code, res.status);
  }
  return json.data;
}

/** POST JSON; throws an Error carrying the server's message on failure. */
export function postJson(url: string, body?: unknown): Promise<unknown> {
  return requestJson(url, "POST", body);
}

/** PATCH JSON; same contract as postJson. */
export function patchJson(url: string, body?: unknown): Promise<unknown> {
  return requestJson(url, "PATCH", body);
}

/** DELETE a resource; same contract as postJson. */
export function deleteJson(url: string): Promise<unknown> {
  return requestJson(url, "DELETE");
}

export type JsonFetchResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string; status: number };

/** fetch wrapper that never throws; returns a normalized result. */
export async function jsonFetch(
  url: string,
  init?: RequestInit
): Promise<JsonFetchResult> {
  try {
    const res = await fetch(url, init);
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && isApiSuccess(json)) return { ok: true, data: json.data };
    if (isApiError(json)) {
      return { ok: false, message: json.error.message, status: res.status };
    }
    return {
      ok: false,
      message: `Request failed (${res.status}).`,
      status: res.status,
    };
  } catch {
    return {
      ok: false,
      message: "Network error. Check your connection.",
      status: 0,
    };
  }
}
