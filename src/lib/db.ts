import { PrismaClient } from '@prisma/client'
import { ensureSqliteFile } from '@/lib/ensure-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Serverless bootstrap: on Vercel, copy the bundled EMPTY schema SQLite
// (prisma/schema-only.db — 30 tables, 0 rows, no demo data) to the writable
// DATABASE_URL target (e.g. file:/tmp/fmd.db) before the first query.
// See src/lib/ensure-db.ts for the safety rationale.
ensureSqliteFile()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is a dev-only affordance; in production it adds stdout
    // latency on every call and leaks query shapes into function logs.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
