import fs from "node:fs";
import path from "node:path";

/**
 * Serverless SQLite bootstrap.
 *
 * On Vercel (and any host with a read-only project filesystem) the only
 * writable directory is /tmp. DATABASE_URL points there (e.g.
 * `file:/tmp/medbriq.db`), but the serverless bundle itself is read-only —
 * so on the first Prisma use of a cold instance we copy the bundled demo
 * database (prisma/seed.db, traced into the function bundle via
 * outputFileTracingIncludes in next.config.ts) to that target path.
 *
 * Writes then persist for the lifetime of the warm instance; a new cold
 * start resets to the seeded demo state. This keeps the public demo fully
 * functional (login, booking, dashboards) without an external database.
 *
 * - Local dev: `db/custom.db` already exists → no-op.
 * - Firestore deployments: Prisma is never constructed → inert.
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

    const seed = path.join(process.cwd(), "prisma", "seed.db");
    if (!fs.existsSync(seed)) return; // Let Prisma surface the real error.

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(seed, target);
  } catch {
    // Never break request handling here — if the copy failed, Prisma will
    // report the unusable database on the actual query.
  }
}
