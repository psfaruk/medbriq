"use client";

/**
 * Typed fetch helpers for the Find Medi Doctor API envelope:
 *   { ok: true, data } | { ok: false, error: { message, code } }
 *
 * `apiGet/apiPost/...` throw ApiCallError (message from the server) so
 * screens can render actionable error states. Use `jsonFetch` when a
 * non-throwing result object is preferred.
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

function isApiSuccess(v: unknown): v is { ok: true; data: unknown } {
  return (
    typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true
  );
}

function isApiError(
  v: unknown
): v is { ok: false; error: { message: string; code: string } } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { ok?: unknown }).ok === false &&
    typeof (v as { error?: { message?: unknown } }).error?.message === "string"
  );
}

async function request<T>(
  url: string,
  method: string,
  body?: unknown
): Promise<T> {
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
      : "Something went wrong. Please try again.";
    const code = isApiError(json) ? json.error.code : null;
    throw new ApiCallError(message, code, res.status);
  }
  return json.data as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url, "GET");
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, "POST", body);
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, "PATCH", body);
}

export function apiPut<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, "PUT", body);
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, "DELETE");
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
