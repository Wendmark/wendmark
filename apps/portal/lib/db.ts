import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { getEnv } from './env'

/**
 * One Prisma client for the whole app, created on first use.
 *
 * Next.js reloads modules on every change in development, which would open a
 * new pool of connections each time and exhaust the database, so the client
 * is kept on globalThis. It is created lazily for the same reason the
 * environment is read lazily: importing a module should not connect to
 * anything, or every test that imports a service needs a live database.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export function getDb(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing) return existing

  const env = getEnv()
  // Prisma 7 talks to Postgres through a driver adapter rather than its own
  // query engine binary, which keeps deployments lighter.
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
  if (env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  return client
}
