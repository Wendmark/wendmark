import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, checkPassword, hashPassword, verifyPassword } from './password'

const password = 'correct horse battery staple'

describe('checkPassword', () => {
  it('accepts a long enough password', () => {
    expect(checkPassword(password)).toEqual({ ok: true })
  })

  it('asks for more characters when it is short', () => {
    const result = checkPassword('short')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain(String(MIN_PASSWORD_LENGTH))
  })

  it('rejects whitespace pretending to be a password', () => {
    expect(checkPassword('              ').ok).toBe(false)
  })
})

describe('hashing', () => {
  it('stores something that is not the password', async () => {
    const hashed = await hashPassword(password)
    expect(hashed).not.toContain(password)
    expect(hashed.startsWith('$argon2id$')).toBe(true)
  })

  it('produces a different hash every time', async () => {
    expect(await hashPassword(password)).not.toBe(await hashPassword(password))
  })

  it('recognises the right password', async () => {
    const hashed = await hashPassword(password)
    expect(await verifyPassword(hashed, password)).toBe(true)
  })

  it('rejects the wrong password', async () => {
    const hashed = await hashPassword(password)
    expect(await verifyPassword(hashed, 'correct horse battery stapl3')).toBe(false)
  })

  it('treats an account with no password as unable to sign in this way', async () => {
    expect(await verifyPassword(null, password)).toBe(false)
  })

  it('treats a corrupted hash as a failed sign-in, not a crash', async () => {
    expect(await verifyPassword('not a hash at all', password)).toBe(false)
  })
})
