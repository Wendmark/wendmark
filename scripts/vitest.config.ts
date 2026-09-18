import { defineConfig } from 'vitest/config'

// Repo-level tests (architecture checks). Package tests run via turbo.
export default defineConfig({
  test: {
    root: new URL('..', import.meta.url).pathname,
    include: ['scripts/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
