import { PrismaClient } from '@prisma/client'
import { ensureSqliteFile } from '@/lib/ensure-db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Serverless bootstrap: on Vercel, copy the bundled demo SQLite file to the
// writable /tmp target (see src/lib/ensure-db.ts) before the first query.
ensureSqliteFile()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db