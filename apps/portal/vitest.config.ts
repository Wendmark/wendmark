import { defineConfig } from 'vitest/config'

/**
 * The fast tests: pure functions, no database, no Docker.
 *
 * Anything needing Postgres is named `*.db.test.ts` and runs under
 * vitest.db.config.ts instead, so `pnpm test` stays something you can run
 * without setting anything up.
 */
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/generated/**', '**/*.db.test.ts'],
  },
})
