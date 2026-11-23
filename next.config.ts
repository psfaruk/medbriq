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
 * - The bundled demo SQLite (prisma/seed.db) is NO LONGER traced into the
 *   serverless function. It is demo data and must never reach a production
 *   bundle. src/lib/ensure-db.ts additionally refuses to copy it when
 *   NODE_ENV=production.
 *
 * SANDBOX NOTE (dev-server wedge immunity):
 * /home/z/my-project/upload is a network FUSE mount that can hang forever.
 * Three subsystems walk the project tree at dev time and must never touch it:
 *   1. Turbopack's Rust engine (watches the project root recursively) —
 *      avoided by running dev with `--webpack` (see package.json dev script).
 *   2. Webpack's own watchpack (context watch) — excluded via
 *      watchOptions.ignored below.
 *   3. Tailwind v4 automatic source detection — replaced with explicit
 *      `source(none)` + `@source "../"` in src/app/globals.css.
 * Production builds (Vercel) do not have the mount and stay on defaults.
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
  // Keep file tracing away from sandbox-only directories.
  outputFileTracingExcludes: {
    "*": ["./upload/**", "./docs/**", "./tool-results/**"],
  },
  // NOTE: prisma/seed.db is deliberately NOT traced any more. It holds the
  // fictional demo dataset; shipping it would put fake doctors one cold start
  // away from a live healthcare platform.
  webpack: (config, { dev }) => {
    if (dev) {
      // The sandbox is memory-constrained (4GB): the default
      // eval-source-map devtool inflates compile memory heavily.
      config.devtool = "eval";
    }
    // Webpack dev watch: never descend into the sandbox FUSE mount.
    // NOTE: both globs are required — "**/upload" matches the directory
    // path itself (watchpack checks ignored() on the dir before descending),
    // "**/upload/**" matches its contents. scripts/upload-guard.so (via
    // scripts/dev-server.js) adds a syscall-level guard as defense in depth.
    const existing = config.watchOptions?.ignored;
    const base: unknown[] = Array.isArray(existing)
      ? existing
      : existing
        ? [String(existing)]
        : [];
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        ...base,
        // The dev script tees its own log into the project root, and the
        // SQLite database + WAL journals live in db/. Watching either creates
        // an infinite rebuild loop (log/db write → rebuild → more writes).
        // Same for sandbox-only artifacts.
        "**/upload",
        "**/upload/**",
        "**/*.log",
        "**/db/**",
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
        "**/tool-results/**",
        "**/docs/**",
        "**/screenshots/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
