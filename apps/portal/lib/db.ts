import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { env } from './env'

/**
 * One Prisma client for the whole app.
 *
 * Next.js reloads modules on every change in development, which would open a
 * new pool of connections each time and exhaust the database. Keeping the
 * client on globalThis survives those reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  // Prisma 7 talks to Postgres through a driver adapter rather than its own
  // query engine binary, which keeps deployments lighter.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db
