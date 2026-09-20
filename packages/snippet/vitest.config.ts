import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The snippet is DOM code; tests run against a simulated browser.
    environment: 'jsdom',
  },
})
