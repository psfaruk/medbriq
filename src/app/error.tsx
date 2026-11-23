"use client";

/**
 * Route-level error boundary for the single-route SPA.
 *
 * The whole app renders inside "/" — without this boundary, one malformed
 * DTO field or a failed dynamic chunk import unmounts the entire app to
 * Next's default crash screen with no way back. This boundary keeps the
 * chrome and offers a reset that re-mounts the client app from scratch.
 */

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface it in the console for diagnostics; the boundary keeps the UI.
    console.error("[fmd-boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "24px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "#fee2e2",
          fontSize: 22,
        }}
        aria-hidden
      >
        ⚠️
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          maxWidth: 420,
          margin: 0,
        }}
      >
        An unexpected error interrupted the app. Your data is safe — reloading
        will take you back to the dashboard.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          background: "#16a34a",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reload app
      </button>
    </div>
  );
}
