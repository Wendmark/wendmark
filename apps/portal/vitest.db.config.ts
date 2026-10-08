import { defineConfig } from 'vitest/config'

/**
 * The tests that need a real Postgres.
 *
 * Kept apart from `pnpm test` on purpose: a contributor fixing a typo should
 * not need Docker running, and the fast tests stay fast. CI runs both.
 *
 * Run them with `pnpm --filter @wendmark/portal test:db`, against the
 * database in `apps/portal/.env` — which `pnpm bootstrap` has already set up.
 */
export default defineConfig({
  test: {
    include: ['**/*.db.test.ts'],
    globalSetup: ['./test/migrate.ts'],
    setupFiles: ['./test/empty-database.ts'],
    // Each file gets a clean database, so they must not run at the same time.
    fileParallelism: false,
    testTimeout: 20_000,
  },
})
