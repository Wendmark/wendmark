import { defineConfig } from 'tsup'

// An unpacked Chrome extension in dist/: the manifest and icons copied from
// public/, plus one file per place the code runs. Load dist/ from
// chrome://extensions with "Load unpacked".
export default defineConfig([
  {
    // The service worker, which runs in Chrome rather than in any page, and
    // the side panel's script. Both are loaded as modules.
    entry: { background: 'src/background.ts', sidepanel: 'src/sidepanel.ts' },
    format: ['esm'],
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
    target: 'es2022',
    platform: 'browser',
    // No size budget here (it is installed once), but no reason to ship more.
    minify: true,
    noExternal: [/.*/],
    publicDir: 'public',
    // Both builds run at once, so neither cleans dist/; the build script
    // empties it first.
    clean: false,
  },
  {
    // Injected into a page when asked. Content scripts cannot be modules
    // when injected by file, so this one is a self-contained IIFE.
    entry: { content: 'src/content.ts' },
    format: ['iife'],
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
    target: 'es2022',
    platform: 'browser',
    // No size budget here (it is installed once), but no reason to ship more.
    minify: true,
    noExternal: [/.*/],
    clean: false,
  },
])
