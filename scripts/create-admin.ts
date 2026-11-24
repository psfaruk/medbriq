/**
 * Create (or update) the first ADMIN account — the controlled bootstrap path
 * for a real deployment with NO demo data.
 *
 *   bun scripts/create-admin.ts <email> <password> [name] [phone]
 *
 * - The database is never seeded with demo accounts; an admin is created
 *   only through this explicit, auditable command.
 * - Idempotent: re-running with the same email updates the password (and
 *   name/phone when given) instead of failing.
 * - Safety: an existing non-admin account is never silently elevated — the
 *   script refuses and tells you to pick a different email.
 *
 * Requires DATABASE_URL (local SQLite) — on a Firestore production build,
 * create the admin user document through the Firebase console instead
 * (role: "ADMIN", status: "ACTIVE"); see docs/PRODUCTION-RUNBOOK.md §4.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

const MIN_PASSWORD_LENGTH = 10;

function usage(): never {
  console.log(
    "Usage: bun scripts/create-admin.ts <email> <password> [name] [phone]\n" +
      "  email     admin login (e.g. admin@yourdomain.com)\n" +
      "  password  at least " + MIN_PASSWORD_LENGTH + " characters\n" +
      "  name      display name (default: \"Platform Admin\")\n" +
      "  phone     optional, e.g. +880 17xx-xxxxxx"
  );
  process.exit(1);
}

async function main() {
  const [email, password, name, phone] = process.argv.slice(2);
  if (!email || !password) usage();

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    console.error("✗ Invalid email address.");
    process.exit(1);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `✗ Password too short (min ${MIN_PASSWORD_LENGTH} chars). Generate one: openssl rand -base64 18`
    );
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (existing && existing.role !== "ADMIN") {
    console.error(
      `✗ ${normalizedEmail} already exists with role ${existing.role}. ` +
        "This script never elevates a non-admin account — choose a fresh email."
    );
    process.exit(1);
  }

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: hashPassword(password),
        name: name?.trim() || existing.name,
        phone: phone?.trim() || existing.phone,
        status: "ACTIVE",
      },
    });
    console.log(`✓ Admin password updated for ${normalizedEmail}`);
  } else {
    await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        name: name?.trim() || "Platform Admin",
        phone: phone?.trim() || null,
        role: "ADMIN",
      },
    });
    console.log(`✓ Admin created: ${normalizedEmail}`);
  }

  console.log("Next: bun run dev, then sign in from /?view=auth&mode=login");
}

main()
  .catch((e) => {
    console.error("Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
