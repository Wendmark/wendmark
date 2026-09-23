# Wendmark

Wendmark shows people how to use a web app with an on-screen teaching cursor.
A product owner records a process once. End users replay it as step-by-step
guidance: a cursor glides to the next thing to click, and the user clicks it
themselves. **Wendmark guides only — it never clicks or types for the user.**

> Status: scaffolding. The packages exist with placeholder exports and the
> initial flow schema. No product features yet.

## Repository layout

```
packages/
  core/        @wendmark/core     Types and zod schemas (Flow, Step). No DOM, network or Node.
  dom/         @wendmark/dom      Element fingerprints and resolver. Depends on core.
  snippet/     @wendmark/snippet  Embeddable player/recorder/UI. Builds to apps/portal/public/snippet.js.
apps/
  portal/      @wendmark/portal      Next.js (App Router) portal. Depends on core only.
  playground/  @wendmark/playground  "Fika" coffee-subscription demo app to test guidance against.
docs/          Design notes (see docs/legacy-notes.md)
legacy/        Old Chrome extension prototype, reference only, to be deleted
```

The dependency rules between these are enforced by ESLint. See [CLAUDE.md](CLAUDE.md).

## Setup

Requirements: **Node 22** (see `.nvmrc`) and **pnpm 9**. The `packageManager`
field pins pnpm, so with Corepack enabled the right version is used
automatically.

```bash
corepack enable
pnpm install
docker compose up -d                       # Postgres for the portal
cp apps/portal/.env.example apps/portal/.env
pnpm --filter @wendmark/portal db:migrate   # apply migrations
pnpm dev
```

Already have a Postgres you would rather use? Point `DATABASE_URL` at it and
skip the compose file.

Then open the portal at http://localhost:3100. Add an app, paste its script
tag into that app, and the portal will confirm it has seen the snippet. A fresh database sends you to
**/setup** to create your organization and its first administrator. If you ran
`db:seed` instead, sign in as `dev@example.com` with the password the seed
prints.

Signing in uses an email and a password by default: no mail server is
required. Set `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` to add
single sign-on. See [docs/decisions/auth.md](docs/decisions/auth.md).

`pnpm dev` starts:

- Portal: http://localhost:3100 (the snippet is served at `/snippet.js`)
- Playground (Fika): http://localhost:5174
- Snippet: tsup in watch mode, rebuilding `apps/portal/public/snippet.js`

## Scripts

| Command          | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | Portal + playground + snippet watch                             |
| `pnpm build`     | Build everything (snippet is built before the portal)           |
| `pnpm test`      | Unit tests in every package, plus the repo-level boundary tests |
| `pnpm typecheck` | `tsc --noEmit` in every package                                 |
| `pnpm lint`      | ESLint across the repo, including dependency-boundary rules     |
| `pnpm size`      | Build the snippet and fail if it exceeds 30 KB gzipped          |
| `pnpm format`    | Prettier                                                        |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test and size on every PR.
