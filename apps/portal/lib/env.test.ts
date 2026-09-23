import { describe, expect, it } from 'vitest'
import { getEnv, parseEnv } from './env'

const valid = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/wendmark' }

describe('parseEnv', () => {
  it('accepts a Postgres connection string', () => {
    expect(parseEnv(valid).DATABASE_URL).toBe(valid.DATABASE_URL)
  })

  it('assumes development when nothing says otherwise', () => {
    expect(parseEnv(valid).NODE_ENV).toBe('development')
  })

  it('keeps the environment it is given', () => {
    expect(parseEnv({ ...valid, NODE_ENV: 'production' }).NODE_ENV).toBe('production')
  })

  it('says what to fix when the database is not configured', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/)
    expect(() => parseEnv({})).toThrow(/\.env\.example/)
  })

  it('rejects a connection string for the wrong kind of database', () => {
    expect(() => parseEnv({ DATABASE_URL: 'mysql://localhost/wendmark' })).toThrow(/Postgres/)
  })

  it('rejects an unknown NODE_ENV rather than guessing', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/)
  })

  it('reads the real environment on first use, not on import', () => {
    process.env['DATABASE_URL'] = valid.DATABASE_URL
    expect(getEnv().DATABASE_URL).toBe(valid.DATABASE_URL)
  })
})
