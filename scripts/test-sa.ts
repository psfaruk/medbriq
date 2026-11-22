import { readFileSync } from "fs";
async function main() {
  process.env.FIREBASE_SERVICE_ACCOUNT = readFileSync("/tmp/sa-fixed.json", "utf8");
  const { getFirestoreFromEnv } = await import("../src/lib/data/firestore-store");
  const db = getFirestoreFromEnv();
  const snap = await db.collection("doctors").limit(3).get();
  const out = ["FIRESTORE OK — sample doctors: " + snap.size];
  snap.forEach(d => out.push(" - " + d.id + " | " + ((d.data() as { name?: string }).name ?? "?")));
  const hosp = await db.collection("hospitals").limit(2).get();
  out.push("hospitals sample: " + hosp.size);
  const users = await db.collection("users").limit(2).get();
  out.push("users sample: " + users.size);
  require("fs").writeFileSync("/tmp/fs-test.txt", out.join("\n"));
}
main().catch(e => require("fs").writeFileSync("/tmp/fs-test.txt", "ERR: " + e.message?.slice(0, 300)));
