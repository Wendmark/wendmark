// @ts-check
import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Architectural boundaries. This table is the source of truth, mirrored in
 * CLAUDE.md. A violating import is a lint error, and scripts/boundaries.test.ts
 * proves each rule fires.
 *
 *   core        -> (nothing internal; zod only)
 *   dom         -> core
 *   snippet     -> core, dom
 *   portal      -> core
 *   playground  -> (nothing internal)
 *   extension   -> core, dom, snippet
 */
export const ALLOWED_DEPENDENCIES = {
  core: [],
  dom: ['core'],
  snippet: ['core', 'dom'],
  portal: ['core'],
  playground: [],
  extension: ['core', 'dom', 'snippet'],
}

/** External packages core may import. Everything else is rejected. */
const CORE_EXTERNALS = ['zod']
/** Extra externals allowed in core's test files only. */
const CORE_TEST_EXTERNALS = ['vitest']

const elements = [
  { type: 'core', pattern: 'packages/core/**', partialMatch: false },
  { type: 'dom', pattern: 'packages/dom/**', partialMatch: false },
  { type: 'snippet', pattern: 'packages/snippet/**', partialMatch: false },
  { type: 'portal', pattern: 'apps/portal/**', partialMatch: false },
  { type: 'playground', pattern: 'apps/playground/**', partialMatch: false },
  { type: 'extension', pattern: 'apps/extension/**', partialMatch: false },
  { type: 'tooling', pattern: 'scripts/**', partialMatch: false },
]

const boundaryPolicies = [
  // Each element may import itself and the elements in its row of the table.
  ...Object.entries(ALLOWED_DEPENDENCIES).map(([from, to]) => ({
    from: { element: { type: from } },
    allow: { to: { element: { types: [from, ...to] } } },
  })),
  // Third-party packages are fine by default…
  { allow: { to: { module: { origin: 'external' } } } },
  { allow: { to: { module: { origin: 'core' } } } },
  // …except core, which stays pure: zod only, no Node built-ins.
  // (Policies are evaluated in order and the last match wins, so the zod
  // allowance must come after the blanket disallow.)
  {
    from: { element: { type: 'core' } },
    disallow: { to: { module: { origin: 'external' } } },
    message: '@wendmark/core may only import: ' + CORE_EXTERNALS.join(', '),
  },
  {
    from: { element: { type: 'core' } },
    allow: { to: { module: { origin: 'external', source: CORE_EXTERNALS } } },
  },
  {
    from: { element: { type: 'core' }, file: { categories: 'test' } },
    allow: { to: { module: { origin: 'external', source: CORE_TEST_EXTERNALS } } },
  },
  {
    from: { element: { type: 'core' } },
    disallow: { to: { module: { origin: 'core' } } },
    message: '@wendmark/core must not use Node built-ins',
  },
  // A @wendmark/* import that did not resolve to a known package is never OK
  // (e.g. a package with no exports map, or a typo) — don't let it pass as "external".
  {
    disallow: { to: { module: { origin: 'external', source: '@wendmark/**' } } },
    message: 'Unresolved @wendmark/* import — check the dependency table in CLAUDE.md',
  },
  // Tooling (config files, scripts) must not reach into product code.
  { from: { element: { type: 'tooling' } }, allow: { to: { element: { type: 'tooling' } } } },
]

/** Browser/Node globals core must not touch (DOM is also absent from its tsconfig lib). */
const CORE_FORBIDDEN_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'process',
  'Buffer',
  'require',
  '__dirname',
  '__filename',
].map((name) => ({ name, message: '@wendmark/core has no DOM, network or Node APIs.' }))

export default tseslint.config(
  {
    ignores: [
      'legacy/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      'apps/portal/public/snippet.js',
      'apps/portal/public/author.js',
      'apps/portal/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // ---- Architectural boundaries (all files) ----
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['packages/*/tsconfig.json', 'apps/*/tsconfig.json'],
          noWarnOnMultipleProjects: true,
        },
      },
      'boundaries/elements': elements,
      'boundaries/files': [{ category: 'test', pattern: '**/*.test.ts' }],
      // Root-level files can't be elements (element patterns match folders).
      // This file imports only lint plugins, so it is safe to leave unclassified.
      'boundaries/ignore': ['eslint.config.js'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: boundaryPolicies,
          // Also evaluate third-party and Node built-in imports (needed for the
          // core purity rules), and local imports of files outside any element.
          checkAllOrigins: true,
          checkUnknownLocals: true,
        },
      ],
      // Every file must belong to a known element, so nothing slips past the table.
      'boundaries/no-unknown-files': 'error',
    },
  },

  // ---- core: pure, portable ----
  {
    files: ['packages/core/**/*.ts'],
    rules: { 'no-restricted-globals': ['error', ...CORE_FORBIDDEN_GLOBALS] },
  },

  // ---- snippet: no framework ----
  {
    files: ['packages/snippet/src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react|react-dom|preact|vue|svelte|solid-js|lit|@angular/.*)(/.*)?$',
              message: 'The snippet is framework-free: plain DOM inside a shadow root.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/dom/src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },

  // ---- apps ----
  {
    files: ['apps/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['apps/portal/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  // The extension runs inside other people's pages too, and stays
  // framework-free for the same reason as the snippet.
  {
    files: ['apps/extension/src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react|react-dom|preact|vue|svelte|solid-js|lit|@angular/.*)(/.*)?$',
              message: 'The extension is framework-free, like the snippet whose engine it shares.',
            },
          ],
        },
      ],
    },
  },

  // ---- tooling ----
  {
    files: [
      'scripts/**',
      'apps/extension/scripts/**',
      '*.{js,mjs,ts}',
      '**/*.config.{js,mjs,ts}',
    ],
    languageOptions: { globals: globals.node },
  },

  prettier,
)
