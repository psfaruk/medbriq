import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Development uses local SQLite via DATABASE_URL (see .env.example — the
// relative path resolves next to prisma/schema.prisma). Production must run
// on Firestore (FIREBASE_SERVICE_ACCOUNT); there is no bundled demo database
// and no automatic seeding — run `bun prisma/seed.ts` only if you explicitly
// want the fictional demo dataset.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is a dev-only affordance; in production it adds stdout
    // latency on every call and leaks query shapes into function logs.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
