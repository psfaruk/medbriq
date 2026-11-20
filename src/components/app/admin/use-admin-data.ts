"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tiny async-data hook for the admin panel.
 *
 * The loader must be stable (wrap it in useCallback with an empty dep array
 * in the caller). `reload()` flips a nonce that re-runs the fetch — state is
 * only ever set from async callbacks, never synchronously inside the effect
 * body (matches the project's lint requirements).
 */
export type AdminData<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

export function useAdminData<T>(loader: () => Promise<T>): AdminData<T> {
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loader()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [loader, nonce]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  return { data, error, loading, reload };
}

/** Extract a human-readable message from an ApiCallError-ish failure. */
export function errMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : "Something went wrong. Please try again.";
}
