/**
 * Tiny in-process TTL cache for hot public read endpoints.
 *
 * WHY: on serverless (Vercel) every uncached request pays
 *   cold-start (firebase-admin init ~1-3s) + Firestore round trips
 *   (the doctors list alone walks ~14 days × 2 reads per doctor for the
 *   "next available" label). This cache, kept on globalThis, survives
 *   instance freeze/thaw cycles so the common case is a ~0ms hit.
 *
 * Combined with `Cache-Control: s-maxage=…` on the same endpoints, most
 * requests are served from the Vercel edge CDN without invoking the
 * function at all; this memory layer protects the remaining origin hits.
 *
 * Rules:
 *  - Only cache PUBLIC, user-independent data. Anything auth-scoped
 *    (bookings, notifications, dashboards) must never go through here.
 *  - Keep TTLs short (≤120s) so admin/doctor edits appear quickly.
 *  - Mutating routes that change public data call invalidateMemoryCache().
 */

type CacheEntry = { value: unknown; expiresAt: number };

const globalForCache = globalThis as unknown as {
  __fmdMemCache: Map<string, CacheEntry> | undefined;
};

const cache: Map<string, CacheEntry> = (globalForCache.__fmdMemCache ??=
  new Map());

/** Hard cap to bound memory on hostile query-string variety. */
const MAX_ENTRIES = 500;

function pruneExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/**
 * Get-or-load with TTL. Concurrent misses share one loader via an in-flight
 * promise map so a stampede does not multiply Firestore reads.
 */
const globalForInflight = globalThis as unknown as {
  __fmdMemCacheInflight: Map<string, Promise<unknown>> | undefined;
};
const inflight: Map<string, Promise<unknown>> =
  (globalForInflight.__fmdMemCacheInflight ??= new Map());

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const load = (async () => {
    try {
      const value = await loader();
      if (cache.size > MAX_ENTRIES) pruneExpired(Date.now());
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })() as Promise<T>;
  inflight.set(key, load);
  return load;
}

/** Drop cached entries (all, or only keys starting with `prefix`). */
export function invalidateMemoryCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Edge-CDN cache headers for public GET endpoints. Browsers keep max-age=0
 * (so logged-in users always revalidate) while Vercel's CDN serves repeats
 * for `sMaxage` seconds without invoking the function.
 */
export function publicCacheHeaders(sMaxage: number): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${sMaxage}, stale-while-revalidate=${
      sMaxage * 5
    }`,
  };
}
