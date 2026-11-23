"use client";

/**
 * Typed fetch helpers for the Find Medi Doctor API envelope:
 *   { ok: true, data } | { ok: false, error: { message, code, …extra } }
 *
 * `apiGet/apiPost/...` throw ApiCallError (message from the server) so
 * screens can render actionable error states. Use `jsonFetch` when a
 * non-throwing result object is preferred.
 */

export class ApiCallError extends Error {
  readonly code: string | null;
  readonly status: number;
  /** Extra fields the server attached to the error envelope (e.g. the
   * fresh `priceBreakdown` on 409 PRICE_CHANGED) — enables single-round-
   * trip recovery instead of refetch loops. */
  readonly extra: Record<string, unknown> | null;

  constructor(
    message: string,
    code: string | null,
    status: number,
    extra?: Record<string, unknown> | null
  ) {
    super(message);
    this.name = "ApiCallError";
    this.code = code;
    this.status = status;
    this.extra = extra ?? null;
  }
}

/** Fired when a request comes back 401 UNAUTHENTICATED — the app shell
 * listens (src/components/app/app.tsx) and resets the session so the auth
 * wall re-appears instead of every screen failing forever. */
export const UNAUTHORIZED_EVENT = "fmd:unauthorized";

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
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Normalize browser-level network failures ("Failed to fetch") into the
    // same actionable message users see elsewhere.
    throw new ApiCallError(
      "Network error. Check your connection.",
      null,
      0
    );
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || !isApiSuccess(json)) {
    const message = isApiError(json)
      ? json.error.message
      : "Something went wrong. Please try again.";
    const code = isApiError(json) ? json.error.code : null;
    // Session expiry mid-use: surface one event so the shell can reset the
    // session instead of leaving every screen in a permanent error state.
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    const extra = isApiError(json)
      ? Object.fromEntries(
          Object.entries(json.error as Record<string, unknown>).filter(
            ([key]) => key !== "message" && key !== "code"
          )
        )
      : null;
    throw new ApiCallError(
      message,
      code,
      res.status,
      extra && Object.keys(extra).length > 0 ? extra : null
    );
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
