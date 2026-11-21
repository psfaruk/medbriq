/**
 * Read-only Firestore check: connects with FIREBASE_SERVICE_ACCOUNT from the
 * environment and reports document counts per demo collection. Used to verify
 * whether the production Firestore database is seeded before a deploy.
 *
 * Run: bun --env-file=<env-file> scripts/check-firestore.ts
 */
import { getFirestoreFromEnv } from "../src/lib/data/firestore-store";

const DEMO_COLLECTIONS = [
  "users",
  "doctors",
  "specialties",
  "hospitals",
  "appointments",
  "reviews",
];

async function main() {
  const fs = getFirestoreFromEnv();
  const counts = await Promise.all(
    DEMO_COLLECTIONS.map(async (name) => {
      const snap = await fs.collection(name).get();
      return { name, count: snap.size };
    })
  );
  console.log("Firestore document counts:");
  for (const { name, count } of counts) {
    console.log(`  ${name.padEnd(14)} ${count}`);
  }
  const doctors = counts.find((c) => c.name === "doctors")?.count ?? 0;
  console.log(
    doctors > 0
      ? `RESULT: SEEDED (${doctors} doctors)`
      : "RESULT: EMPTY — run scripts/firestore-seed.ts"
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
