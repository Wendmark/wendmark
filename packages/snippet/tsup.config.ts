import { defineConfig } from 'tsup'

// The snippet ships as one self-contained IIFE that exposes exactly one
// global (window.Wendmark). The portal serves it from /snippet.js.
export default defineConfig({
  entry: { snippet: 'src/index.ts' },
  format: ['iife'],
  globalName: 'Wendmark',
  outDir: '../../apps/portal/public',
  // outDir is shared with the portal's other static files — never wipe it.
  clean: false,
  outExtension: () => ({ js: '.js' }),
  target: 'es2020',
  platform: 'browser',
  minify: true,
  sourcemap: false,
  // Bundle workspace packages (and anything else) into the single file.
  noExternal: [/.*/],
  treeshake: true,
})
