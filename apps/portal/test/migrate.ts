import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { requireTestDatabase } from './guard'

/**
 * Brings the test database up to the current schema, once per run.
 *
 * `migrate deploy` rather than `migrate dev`: it applies what exists and
 * never offers to write a new migration, which is what you want in a place
 * nobody is watching.
 */
export default function setup(): void {
  requireTestDatabase(process.env['DATABASE_URL'])

  try {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: new URL('..', import.meta.url).pathname,
      stdio: 'pipe',
    })
  } catch (error) {
    throw new Error('Could not migrate the test database.', { cause: error })
  }
}
