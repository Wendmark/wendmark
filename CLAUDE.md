# CLAUDE.md

Guidance for working in the Wendmark monorepo. Read this before changing code.

## The one rule: guide, never act

Wendmark **shows** users what to do. It **never does it for them**.

- Never dispatch synthetic input: no `.click()`, `dispatchEvent(new MouseEvent…)`,
  `.focus()` to steer the user, `.value =`, `form.submit()`, `requestSubmit()`,
  keyboard emulation, or navigation on the user's behalf.
- Guidance UI must not intercept the user's interaction with the page. Overlays
  use `pointer-events: none`. Only our own panel controls receive events.
- A step advances because **the user** performed it, observed through passive,
  capture-phase listeners that never call `preventDefault()` or
  `stopPropagation()` on host-page events.
- If a feature request would make Wendmark act for the user, stop and raise it.
  Don't implement it.

## Packages and dependency rules

| Package                                    | May depend on (internal) | Notes                                                                            |
| ------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------- |
| `@wendmark/core` (`packages/core`)         | —                        | Types + zod schemas. Only external dep: `zod`. No DOM, no network, no Node APIs. |
| `@wendmark/dom` (`packages/dom`)           | core                     | Element fingerprints and resolver.                                               |
| `@wendmark/snippet` (`packages/snippet`)   | core, dom                | Player, recorder, UI. Ships as one IIFE.                                         |
| `@wendmark/portal` (`apps/portal`)         | core                     | Next.js App Router. Never imports dom or snippet code.                           |
| `@wendmark/playground` (`apps/playground`) | —                        | Fika demo app. No Wendmark integration yet.                                      |

These rules are **enforced**, not advisory:

- `eslint.config.js` (`ALLOWED_DEPENDENCIES`, `eslint-plugin-boundaries`): a
  violating import, by package name or relative path, fails `pnpm lint`.
- `scripts/boundaries.test.ts` proves every cell of the table fires. It also
  checks that each `package.json` declares only allowed `@wendmark/*` deps.
- `packages/core/tsconfig.json` has no DOM lib and no Node types, and
  `no-restricted-globals` bans `window`, `document`, `fetch`, `process` and
  similar globals in core.

To change the table, update `ALLOWED_DEPENDENCIES` in `eslint.config.js`, this
section, and the package's `package.json` together, in a PR that explains why.
Never silence a boundaries error with an eslint-disable comment.

The portal serves `snippet.js` (a build artifact). It does not import the
snippet. That ordering lives in `turbo.json` as a task dependency only.

## Snippet constraints (`packages/snippet`)

The snippet runs inside customers' apps, so it must be a polite guest.

- **Shadow DOM.** All UI renders inside a single host element with an open
  shadow root and `:host { all: initial }`. Page CSS must not affect us, and
  our CSS must not affect the page. No global styles, no injected `<style>` in
  the page `<head>`.
- **One global.** The bundle exposes exactly `window.Wendmark` (tsup
  `globalName`). No other globals, no prototype patching, no polyfills that
  touch built-ins.
- **No framework.** Plain TypeScript and DOM APIs. React, Preact, Vue, Svelte,
  Lit and similar are lint errors in the snippet.
- **Size budget: 30 KB gzipped**, enforced by `pnpm size` in CI. Check the cost
  of every dependency. Importing anything from `@wendmark/core`'s root pulls in
  **zod (~95 KB gzipped)**, because building a schema is a top-level call the
  bundler cannot drop. Use type-only imports, or the zero-dependency
  `@wendmark/core/guard` entry point for runtime checks in the browser. The
  full zod schemas belong on the server, where size does not matter.
- **Never record typed values.** The recorder captures structure and authored
  labels (role, accessible name, visible text of non-input elements, stable
  attributes). It must never read `.value`, `textContent` of form fields,
  `contenteditable` content, or keystrokes, and never store them. Password,
  email and payment fields get no special case: _no_ field values, ever.
  The core `Target` schema is strict, so unknown keys (like `value`) are rejected.

## Commands

```bash
pnpm install        # Node 22, pnpm 9 (see .nvmrc / packageManager)
pnpm dev            # portal :3100 + playground :5174 + snippet watch
pnpm build          # everything; snippet -> apps/portal/public/snippet.js
pnpm test           # vitest in each package + scripts/boundaries.test.ts
pnpm typecheck      # tsc --noEmit everywhere
pnpm lint           # eslint (boundaries included), --max-warnings 0
pnpm size           # snippet gzipped size, fails above 30 KB
pnpm format         # prettier --write

# the portal's database (Postgres via Prisma 7 with the pg driver adapter)
docker compose up -d                        # local Postgres on :5433
pnpm --filter @wendmark/portal db:migrate   # create and apply a migration
pnpm --filter @wendmark/portal db:studio    # browse the data
```

Authentication is Auth.js with an email and password by default, and optional
OIDC single sign-on. Sessions are JWTs; `user.sessionVersion` is how a session
is revoked. Everything that reads a session goes through
`lib/auth/session.ts`, so that decision stays in one place — see
`docs/decisions/auth.md`. `/setup` creates the first administrator and works
only while no users exist.

After changing the Prisma schema, run `db:migrate` **and restart the dev
server**: the generated client is imported once, so a running server keeps
the old one and new models appear as `undefined`.

The portal reads `DATABASE_URL` and `AUTH_SECRET` from `apps/portal/.env`,
validated by `lib/env.ts`. The generated Prisma client lives in `apps/portal/generated/`
and is gitignored; a `postinstall` hook regenerates it after every install,
including in CI. Run `db:generate` yourself after changing the schema, and
never import Prisma from anywhere but `lib/db.ts`.

Filter to one package: `pnpm --filter @wendmark/core test`.

Before calling any task done, `pnpm typecheck && pnpm lint && pnpm test` must
pass. For snippet changes, `pnpm size` must also pass.

## Conventions

- TypeScript strict everywhere, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. No `any`. Validate untrusted data with the zod
  schemas in core. Don't cast it.
- Internal packages export TypeScript source (`exports: ./src/index.ts`). There
  is no per-package build, except the snippet bundle and the apps.
- Schema changes that break existing flows bump `SCHEMA_VERSION` in core.
  Adding an optional field does not (old flows still parse). Adding a step
  type does not yet either, while nothing is published: today a new step type
  only breaks an _old_ snippet meeting a _new_ flow. Once flows are served to
  snippets we do not control, that case needs handling — either a version
  bump the snippet checks, or a "minimum snippet version" on the flow. Decide
  before the portal serves its first flow.
- Tests live next to the code as `*.test.ts`.
- `legacy/` is reference only. Don't import from it, edit it, or port it. See
  `docs/legacy-notes.md` for what to learn from it.
- Never commit secrets. `NEXT_PUBLIC_*` and `VITE_*` variables are public.

## Pull requests

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Title in Conventional Commit form, scoped to the package:
  `feat(core): add input step type`, `fix(snippet): …`, `chore(repo): …`.
- Keep one concern per PR. Don't mix refactors with behaviour changes.
- The description covers: what changed, why, and how it was verified
  (commands run, manual steps). Add screenshots or a GIF for any visible UI
  change in the snippet or apps.
- CI (typecheck, lint, test, size) must be green. Note any snippet size
  change larger than 1 KB gzipped in the description.
- Any change to the dependency table, the guide-never-act rule, or the snippet
  constraints must be called out explicitly in the PR description.
- Justify every new dependency in the PR (what it does, why we can't
  reasonably do without it, bundle impact if it reaches the snippet).
