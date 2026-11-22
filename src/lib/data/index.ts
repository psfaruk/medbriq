import type { DataStore, StoreKind } from "./types";
import { PrismaStore } from "./prisma-store";
import { FirestoreStore, parseServiceAccountEnv } from "./firestore-store";

/**
 * Find Medi Doctor dual data-store selection.
 *
 * - FIREBASE_SERVICE_ACCOUNT set (and valid JSON) → FirestoreStore, backed by
 *   the Firebase project named in the service account, database id from
 *   FIREBASE_DATABASE_ID (fallback "default"). This is the production path on
 *   Vercel.
 * - Otherwise → PrismaStore + local SQLite (DATABASE_URL). This is the local
 *   development default; no Firebase configuration is needed.
 *
 * The resolved instance is cached (on globalThis, so Next.js dev hot-reloads
 * reuse it) — construct-once semantics like src/lib/db.ts.
 */

const globalForStore = globalThis as unknown as {
  __fmdDataStore: DataStore | undefined;
  __fmdStoreKind: StoreKind | undefined;
};

/** Which backing store is active for this process. */
export function storeKind(): StoreKind {
  if (!globalForStore.__fmdStoreKind) {
    globalForStore.__fmdStoreKind = parseServiceAccountEnv()
      ? "firestore"
      : "prisma";
  }
  return globalForStore.__fmdStoreKind;
}

/** The process-wide DataStore instance (Firestore in production, Prisma locally). */
export function getStore(): DataStore {
  if (!globalForStore.__fmdDataStore) {
    globalForStore.__fmdDataStore =
      storeKind() === "firestore" ? new FirestoreStore() : new PrismaStore();
  }
  return globalForStore.__fmdDataStore;
}

export type { DataStore, StoreKind } from "./types";
export {
  SlotConflictError,
  ReferenceCodeCollisionError,
} from "./types";
export { parseServiceAccountEnv, getFirestoreFromEnv } from "./firestore-store";
