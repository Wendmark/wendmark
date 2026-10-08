/**
 * Refuses to run against a database that is not obviously a test one.
 *
 * These tests empty every table before each file. Someone running them with
 * their ordinary `apps/portal/.env` loaded would lose every process they had
 * recorded, and would find out afterwards. A name is a weak signal, but it
 * is one the person choosing the URL controls, and it costs nothing.
 */
export function requireTestDatabase(url: string | undefined): string {
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. These tests need a Postgres of their own:\n' +
        '  createdb wendmark_test, or see the test:db notes in the README.',
    )
  }

  let name: string
  try {
    name = new URL(url).pathname.replace(/^\//, '')
  } catch {
    throw new Error(`DATABASE_URL is not a URL: ${url}`)
  }

  if (!/test/i.test(name)) {
    throw new Error(
      `Refusing to run against the database "${name}".\n` +
        '  These tests empty every table. Point DATABASE_URL at a database\n' +
        '  whose name contains "test", so this can never be the one holding\n' +
        '  your recordings:\n\n' +
        '    DATABASE_URL="postgresql://wendmark:wendmark@localhost:5433/wendmark_test" \\\n' +
        '      pnpm --filter @wendmark/portal test:db\n',
    )
  }

  return url
}
