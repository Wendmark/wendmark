// Gets a clone from nothing to a portal you can sign into.
//
// Run via `pnpm setup`. Safe to run again: it never overwrites an existing
// .env, and both the migration and the seed are idempotent. Someone who
// already has a Postgres they would rather use can set DATABASE_URL in
// apps/portal/.env themselves and run this — the compose step is skipped
// when the file already exists.
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const envFile = fileURLToPath(new URL('../apps/portal/.env', import.meta.url))
const envExample = fileURLToPath(new URL('../apps/portal/.env.example', import.meta.url))

/** How long to wait for Postgres to accept connections, in seconds. */
const DATABASE_TIMEOUT_SECONDS = 60

const step = (text) => console.log(`\n\u001b[1m${text}\u001b[0m`)
const note = (text) => console.log(`  ${text}`)
const fail = (text) => {
  console.error(`\n\u001b[31m✖ ${text}\u001b[0m\n`)
  process.exit(1)
}

/** Runs a command, showing its output, and stops the setup if it fails. */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options })
  if (result.error?.code === 'ENOENT') return { missing: true }
  if (result.status !== 0) {
    fail(`\`${command} ${args.join(' ')}\` failed. The output above says why.`)
  }
  return { missing: false }
}

/** Runs a command quietly and answers whether it worked. */
function works(command, args) {
  try {
    execFileSync(command, args, { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

step('1/4  Postgres')

if (existsSync(envFile)) {
  note('apps/portal/.env exists already — leaving your database alone.')
} else if (!works('docker', ['--version'])) {
  fail(
    'Docker is not available, and there is no apps/portal/.env yet.\n' +
      '  Either install Docker, or point Wendmark at a Postgres you already\n' +
      '  have: copy apps/portal/.env.example to apps/portal/.env, set\n' +
      '  DATABASE_URL, and run `pnpm setup` again.',
  )
} else {
  run('docker', ['compose', 'up', '-d'])

  // The container answers before the database does, so wait for Postgres
  // itself rather than for Docker.
  process.stdout.write('  waiting for Postgres')
  const deadline = Date.now() + DATABASE_TIMEOUT_SECONDS * 1000
  let ready = false
  while (Date.now() < deadline) {
    if (works('docker', ['exec', 'wendmark-postgres', 'pg_isready', '-U', 'wendmark'])) {
      ready = true
      break
    }
    process.stdout.write('.')
    // A blocking wait keeps this script readable, and it only runs once.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  }
  console.log('')
  if (!ready) {
    fail(
      `Postgres did not start within ${DATABASE_TIMEOUT_SECONDS} seconds.\n` +
        '  `docker compose logs postgres` should say why.',
    )
  }
  note('Postgres is up on port 5433.')
}

step('2/4  Configuration')

if (existsSync(envFile)) {
  note('apps/portal/.env exists already — not touching it.')
} else {
  copyFileSync(envExample, envFile)

  // Nobody runs `openssl rand` on the first try, and an empty AUTH_SECRET
  // fails at sign-in rather than at startup, which is a confusing place to
  // find out.
  const secret = randomBytes(32).toString('base64')
  const contents = readFileSync(envFile, 'utf8').replace(
    'AUTH_SECRET=""',
    `AUTH_SECRET="${secret}"`,
  )
  writeFileSync(envFile, contents)

  note('Wrote apps/portal/.env with a freshly generated AUTH_SECRET.')
}

step('3/4  Database schema')
run('pnpm', ['--filter', '@wendmark/portal', 'exec', 'prisma', 'migrate', 'deploy'])

step('4/4  Example data')
run('pnpm', ['--filter', '@wendmark/portal', 'db:seed'])

console.log(`
\u001b[1mReady.\u001b[0m  Start everything with:

    pnpm dev

  Portal      http://localhost:3100
  Playground  http://localhost:5174   (the "Fika" demo app)

  The seed printed a sign-in above. A real installation creates its first
  administrator at /setup instead, which only works while no users exist.
`)
