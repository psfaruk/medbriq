import fs from "node:fs";
import path from "node:path";

/**
 * Serverless SQLite bootstrap — schema-only, EMPTY data.
 *
 * On Vercel (and any host with a read-only project filesystem) the only
 * writable directory is /tmp. Production DATABASE_URL points there
 * (`file:/tmp/fmd.db`), but the serverless bundle itself is read-only —
 * so on the first Prisma use of a cold instance we copy the bundled
 * SCHEMA-ONLY database (prisma/schema-only.db) to that target path.
 *
 * ── SAFETY (carries over the PR #11 posture) ────────────────────────────
 * The bundled file contains the 30-table schema and ZERO rows — no
 * fictional doctors/hospitals/reviews. PR #11 removed the old bundled
 * DEMO database (prisma/seed.db) precisely because copying fictional
 * medical listings into production was one cold start away from real
 * patients. Bootstrapping an EMPTY schema keeps that guarantee: the app
 * starts EMPTY on every cold start, demo data remains opt-in via
 * `bun prisma/seed.ts` (which writes to the local dev file only).
 *
 * Writes persist for the lifetime of the warm instance; a new cold start
 * resets to the empty schema. That is inherent to SQLite on serverless —
 * durable production data needs the planned PostgreSQL migration
 * (docs/database.md) or Firestore/hybrid mode.
 *
 * - Local dev: the DATABASE_URL target (prisma/db/custom.db) usually
 *   exists already → no-op. On a fresh clone it is created from the same
 *   bundled schema, so `next dev` works before the first `db:push`.
 * - Firestore / hybrid deployments: Prisma is never constructed → inert.
 * - Local `next start` on a writable filesystem: target is created the
 *   same way → works without external databases.
 */
export function ensureSqliteFile(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) return;

  const rawPath = url.slice("file:".length);
  const target = path.isAbsolute(rawPath)
    ? rawPath
    : path.join(process.cwd(), rawPath);

  try {
    if (fs.existsSync(target)) return;

    const bundled = path.join(process.cwd(), "prisma", "schema-only.db");
    if (!fs.existsSync(bundled)) return; // Let Prisma surface the real error.

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(bundled, target);
    console.log(
      "[ensure-db] Bootstrapped EMPTY schema SQLite at",
      target,
      "(30 tables, 0 rows — fresh install starts empty)"
    );
  } catch {
    // Never break request handling here — if the copy failed, Prisma will
    // report the unusable database on the actual query.
  }
}
