// Fails when the built snippet exceeds its gzipped size budget.
// Run via `pnpm size`, which builds the snippet first.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const BUDGET_BYTES = 30 * 1024
const file = fileURLToPath(new URL('../apps/portal/public/snippet.js', import.meta.url))

let source
try {
  source = readFileSync(file)
} catch {
  console.error(`size: ${file} not found. Build the snippet first (pnpm size does this).`)
  process.exit(1)
}

const gzipped = gzipSync(source, { level: 9 }).length
const kb = (n) => `${(n / 1024).toFixed(2)} KB`
const line = `snippet.js: ${kb(source.length)} raw, ${kb(gzipped)} gzipped (budget ${kb(BUDGET_BYTES)})`

if (gzipped > BUDGET_BYTES) {
  console.error(`✖ ${line}`)
  process.exit(1)
}
console.log(`✓ ${line}`)
