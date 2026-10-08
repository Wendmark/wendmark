import 'dotenv/config'
import { beforeEach } from 'vitest'
import { getDb } from '../lib/db'
import { requireTestDatabase } from './guard'

// Checked again here, not only in the global setup: a setup file runs in
// each worker, and emptying the wrong database is not recoverable.
requireTestDatabase(process.env['DATABASE_URL'])

/**
 * Every test starts with an empty database.
 *
 * Tables are read from the catalogue rather than listed here, so a new model
 * does not quietly start leaking rows between tests. `_prisma_migrations` is
 * left alone — emptying it would make Prisma apply everything again.
 */
beforeEach(async () => {
  const tables = await getDb().$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `

  if (tables.length === 0) return

  const names = tables.map((row) => `"public"."${row.tablename}"`).join(', ')
  // One statement, so foreign keys between these tables cannot complain.
  await getDb().$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
})
