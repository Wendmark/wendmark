import { describe, expect, it } from 'vitest'
import { getEnv, hasOidc, parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/wendmark',
  AUTH_SECRET: 'a'.repeat(32),
}

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
    process.env['AUTH_SECRET'] = valid.AUTH_SECRET
    expect(getEnv().DATABASE_URL).toBe(valid.DATABASE_URL)
  })
})

describe('single sign-on', () => {
  const oidc = {
    OIDC_ISSUER: 'https://login.example.com',
    OIDC_CLIENT_ID: 'wendmark',
    OIDC_CLIENT_SECRET: 'secret',
  }

  it('is off when nothing is configured', () => {
    expect(hasOidc(parseEnv(valid))).toBe(false)
  })

  it('is on when the issuer, id and secret are all set', () => {
    expect(hasOidc(parseEnv({ ...valid, ...oidc }))).toBe(true)
  })

  it('stays off when the configuration is half finished', () => {
    expect(hasOidc(parseEnv({ ...valid, OIDC_ISSUER: oidc.OIDC_ISSUER }))).toBe(false)
  })

  it('rejects an issuer that is not a URL, rather than failing at sign-in', () => {
    expect(() => parseEnv({ ...valid, ...oidc, OIDC_ISSUER: 'login.example.com' })).toThrow()
  })
})

describe('variables that arrive empty', () => {
  const required = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'x'.repeat(32),
  }

  it('treats a blank optional variable as absent', () => {
    // Compose writes `OIDC_ISSUER: ${OIDC_ISSUER:-}` as an empty string,
    // which .optional() does not accept and .url() rejects.
    const env = parseEnv({
      ...required,
      OIDC_ISSUER: '',
      OIDC_CLIENT_ID: '',
      OIDC_CLIENT_SECRET: '',
    })

    expect(env.OIDC_ISSUER).toBeUndefined()
    expect(hasOidc(env)).toBe(false)
  })

  it('treats whitespace as absent too', () => {
    expect(parseEnv({ ...required, OIDC_CLIENT_ID: '   ' }).OIDC_CLIENT_ID).toBeUndefined()
  })

  it('still reads a variable that was actually set', () => {
    const env = parseEnv({
      ...required,
      OIDC_ISSUER: 'https://login.example.com',
      OIDC_CLIENT_ID: 'id',
      OIDC_CLIENT_SECRET: 'secret',
    })

    expect(hasOidc(env)).toBe(true)
  })

  it('still complains about a required variable left blank', () => {
    expect(() => parseEnv({ ...required, AUTH_SECRET: '' })).toThrow(/AUTH_SECRET/)
  })
})
