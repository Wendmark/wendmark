import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Tests in this package run against a simulated browser DOM.
    environment: 'jsdom',
  },
})
