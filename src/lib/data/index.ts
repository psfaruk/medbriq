import { PrismaClient } from "@prisma/client";
import type { DataStore, StoreKind } from "./types";
import { PrismaStore } from "./prisma-store";
import { FirestoreStore, parseServiceAccountEnv } from "./firestore-store";
import { HybridStore } from "./hybrid-store";

/**
 * Find Medi Doctor data-store selection.
 *
 * - FIREBASE_SERVICE_ACCOUNT set (and valid JSON), no BOOKING_DATABASE_URL
 *   → FirestoreStore (Firestore-only production). The appointmentBooking
 *   module stays gated in this mode: patient visit history must not leave
 *   the approved region (docs/ARCHITECTURE_CORRECTIONS.md #5).
 * - FIREBASE_SERVICE_ACCOUNT set AND BOOKING_DATABASE_URL set
 *   → HybridStore: public directory on Firestore, regulated booking data
 *   (appointments, visit history, fee settings, notifications, audit logs)
 *   on the in-region database from BOOKING_DATABASE_URL. appointmentBooking
 *   is ENABLED in this mode — the residency constraint is satisfied by
 *   construction, not by freezing the feature. This is the production path
 *   for the booking module.
 * - Otherwise → PrismaStore + local SQLite (DATABASE_URL). Local development
 *   default; no Firebase configuration is needed.
 *
 * The resolved instances are cached (on globalThis, so Next.js dev hot-reloads
 * reuse them) — construct-once semantics like src/lib/db.ts.
 */

const globalForStore = globalThis as unknown as {
  __fmdDataStore: DataStore | undefined;
  __fmdStoreKind: StoreKind | undefined;
};

/** Which backing store is active for this process. */
export function storeKind(): StoreKind {
  if (!globalForStore.__fmdStoreKind) {
    if (parseServiceAccountEnv()) {
      globalForStore.__fmdStoreKind = process.env.BOOKING_DATABASE_URL
        ? "hybrid"
        : "firestore";
    } else {
      globalForStore.__fmdStoreKind = "prisma";
    }
  }
  return globalForStore.__fmdStoreKind;
}

/** The process-wide DataStore instance. */
export function getStore(): DataStore {
  if (!globalForStore.__fmdDataStore) {
    const kind = storeKind();
    if (kind === "hybrid") {
      // Regional client: a SECOND Prisma client bound to the in-region
      // booking database (BOOKING_DATABASE_URL), separate from the primary
      // DATABASE_URL client the PrismaStore singleton would use.
      const regionalClient = new PrismaClient({
        datasourceUrl: process.env.BOOKING_DATABASE_URL as string,
      });
      globalForStore.__fmdDataStore = new HybridStore(
        new FirestoreStore(),
        new PrismaStore(regionalClient),
        regionalClient
      );
    } else if (kind === "firestore") {
      globalForStore.__fmdDataStore = new FirestoreStore();
    } else {
      globalForStore.__fmdDataStore = new PrismaStore();
    }
  }
  return globalForStore.__fmdDataStore;
}

export type { DataStore, StoreKind } from "./types";
export {
  SlotConflictError,
  ReferenceCodeCollisionError,
  IdempotencyMismatchError,
  StatusTransitionError,
  FeeModuleUnavailableError,
} from "./types";
export { parseServiceAccountEnv, getFirestoreFromEnv } from "./firestore-store";
export { HybridStore } from "./hybrid-store";
