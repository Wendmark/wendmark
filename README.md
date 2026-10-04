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
docs/          How it is built (docs/architecture), decisions, design notes
legacy/        Old Chrome extension prototype, reference only, to be deleted
```

The dependency rules between these are enforced by ESLint. See [CLAUDE.md](CLAUDE.md).

For how each part works and why, start with
[docs/architecture](docs/architecture/README.md).

## Setup

Requirements: **Node 22** (see `.nvmrc`), **pnpm 9**, and Docker for the
database. The `packageManager` field pins pnpm, so with Corepack enabled the
right version is used automatically.

```bash
corepack enable
pnpm install
pnpm bootstrap
pnpm dev
```

`pnpm bootstrap` starts Postgres, writes `apps/portal/.env` with a generated
`AUTH_SECRET`, applies the migrations and seeds an example organization, app
and process. It is safe to run again: it never overwrites an existing `.env`,
and the migration and seed are both idempotent.

Already have a Postgres you would rather use? Copy
`apps/portal/.env.example` to `apps/portal/.env`, point `DATABASE_URL` at it,
then run `pnpm bootstrap` — it leaves your database alone and does the rest.

Then open the portal at http://localhost:3100 and sign in as
`dev@example.com` with the password the seed printed. Add an app, paste its
script tag into that app, and the portal will confirm it has seen the
snippet.

A real installation does not use the seed: an empty database sends you to
**/setup** to create your organization and its first administrator, and that
screen closes for good once any user exists.

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
| `pnpm bootstrap` | Database, configuration, migrations and example data            |
| `pnpm dev`       | Portal + playground + snippet watch                             |
| `pnpm build`     | Build everything (snippet is built before the portal)           |
| `pnpm test`      | Unit tests in every package, plus the repo-level boundary tests |
| `pnpm typecheck` | `tsc --noEmit` in every package                                 |
| `pnpm lint`      | ESLint across the repo, including dependency-boundary rules     |
| `pnpm size`      | Build the snippet and fail if it exceeds 30 KB gzipped          |
| `pnpm format`    | Prettier                                                        |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test and size on every PR.

## Licence

Two licences, chosen for where each part ends up running.

| Path                                                | Licence        |
| --------------------------------------------------- | -------------- |
| `packages/core`, `packages/dom`, `packages/snippet` | **Apache-2.0** |
| `apps/portal`, `apps/playground`, everything else   | **AGPL-3.0**   |

The snippet runs inside other companies' products, so it carries a permissive
licence: paste the script tag and nothing is asked of your own source. The
portal is the part someone could host as a service, so it carries the AGPL —
run a modified copy for other people and you publish the modifications.

[LICENSING.md](LICENSING.md) explains what that means in practice.
