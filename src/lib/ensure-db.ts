import fs from "node:fs";
import path from "node:path";

/**
 * Serverless SQLite bootstrap (DEVELOPMENT / PREVIEW ONLY).
 *
 * On Vercel (and any host with a read-only project filesystem) the only
 * writable directory is /tmp. DATABASE_URL points there (e.g.
 * `file:/tmp/fmd.db`), but the serverless bundle itself is read-only —
 * so on the first Prisma use of a cold instance we copy the bundled demo
 * database (prisma/seed.db) to that target path.
 *
 * Writes then persist for the lifetime of the warm instance; a new cold
 * start resets to the seeded demo state. This keeps a PUBLIC DEMO fully
 * functional (login, booking, dashboards) without an external database.
 *
 * ── PRODUCTION REFUSES THIS PATH ──────────────────────────────────────────
 * The bundled database contains FICTIONAL doctors, hospitals and reviews.
 * Copying it into a production instance would put fake medical listings one
 * cold start away from real patients. So when NODE_ENV is `production` this
 * function is a hard no-op and logs nothing about seeding: production must
 * run on Firestore (FIREBASE_SERVICE_ACCOUNT) or the hybrid regional store.
 *
 * - Local dev: `db/custom.db` already exists → no-op.
 * - Firestore / hybrid deployments: Prisma is never constructed → inert.
 */
export function ensureSqliteFile(): void {
  // Production never bootstraps demo data. This is the single most important
  // line in this file.
  if (process.env.NODE_ENV === "production") return;

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
    console.warn(
      "[ensure-db] Bootstrapped the bundled DEMO database at",
      target,
      "— fictional doctors/hospitals, development only."
    );
  } catch {
    // Never break request handling here — if the copy failed, Prisma will
    // report the unusable database on the actual query.
  }
}
