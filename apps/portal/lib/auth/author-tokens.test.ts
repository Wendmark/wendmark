import { describe, expect, it } from 'vitest'
import { generateToken, hashToken, tokensMatch } from './author-tokens'

describe('generateToken', () => {
  it('is long enough not to be guessed', () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(43)
  })

  it('is different every time', () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken))
    expect(tokens.size).toBe(100)
  })

  it('is safe to put in a URL or a message', () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('hashToken', () => {
  it('is what gets stored, not the token', () => {
    const token = generateToken()
    const hashed = hashToken(token)
    expect(hashed).not.toBe(token)
    expect(hashed).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable, so a token can be looked up', () => {
    const token = generateToken()
    expect(hashToken(token)).toBe(hashToken(token))
  })

  it('differs for different tokens', () => {
    expect(hashToken('one')).not.toBe(hashToken('two'))
  })
})

describe('tokensMatch', () => {
  it('recognises the same token', () => {
    expect(tokensMatch('abc123', 'abc123')).toBe(true)
  })

  it('rejects a different one', () => {
    expect(tokensMatch('abc123', 'abc124')).toBe(false)
  })

  it('rejects a different length without throwing', () => {
    expect(tokensMatch('abc', 'abcdef')).toBe(false)
  })
})
