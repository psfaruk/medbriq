import type { NextConfig } from "next";

/**
 * Find Medi Doctor — Next.js configuration
 *
 * PRODUCTION POSTURE (2026-11-23):
 * - Type errors now FAIL the build. `typescript.ignoreBuildErrors: false`
 *   replaced the scaffold default; CI runs `bun run typecheck` as the
 *   compensating gate so problems surface before a deploy is attempted.
 * - reactStrictMode is ON. It only double-invokes effects in development,
 *   so production behaviour is unchanged while dev catches missing
 *   cleanups / double-fetch bugs early.
 */
const nextConfig: NextConfig = {
  // Standalone output is only needed for self-hosting; on Vercel it must stay off.
  output: process.env.VERCEL ? undefined : "standalone",
  // firebase-admin (and its google-gax dependency chain) must not be bundled
  // by the server compiler — load it as an external from node_modules.
  serverExternalPackages: ["firebase-admin"],
  typescript: {
    // Production posture: a type error is a real defect, not a warning.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Hide the floating dev-tools indicator for a clean preview.
  devIndicators: false,
  // Keep the local SQLite database and dev logs out of any server bundle —
  // neither belongs in a deployable function (and watching them would create
  // a write → rebuild loop in dev).
  outputFileTracingExcludes: {
    "*": ["./db/**", "./prisma/db/**", "./*.log"],
  },
};

export default nextConfig;
