import { describe, expect, it } from 'vitest'
import { isAllowedOrigin, parseOrigin, parseOrigins } from './origins'

describe('parseOrigin', () => {
  it('accepts an ordinary https address', () => {
    expect(parseOrigin('https://app.example.com')).toEqual({
      ok: true,
      origin: 'https://app.example.com',
    })
  })

  it('normalises capitals and a trailing slash', () => {
    expect(parseOrigin('https://App.Example.com/')).toEqual({
      ok: true,
      origin: 'https://app.example.com',
    })
  })

  it('keeps a port, because that is a different origin', () => {
    expect(parseOrigin('http://localhost:5174')).toEqual({
      ok: true,
      origin: 'http://localhost:5174',
    })
  })

  it('allows plain http only on your own machine', () => {
    expect(parseOrigin('http://app.example.com').ok).toBe(false)
    expect(parseOrigin('http://127.0.0.1:3000').ok).toBe(true)
  })

  it('refuses an address with a path, which is not an origin', () => {
    const result = parseOrigin('https://app.example.com/dashboard')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('without a path')
  })

  it('explains what is missing rather than just failing', () => {
    const result = parseOrigin('app.example.com')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('https://')
  })

  it('says wildcards are not supported, rather than silently accepting one', () => {
    const result = parseOrigin('https://*.example.com')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('Wildcards')
  })

  it('rejects other schemes', () => {
    expect(parseOrigin('ftp://example.com').ok).toBe(false)
    expect(parseOrigin('javascript:alert(1)').ok).toBe(false)
  })
})

describe('parseOrigins', () => {
  it('keeps the order and drops duplicates', () => {
    const result = parseOrigins([
      'https://app.example.com',
      'https://App.Example.com/',
      'https://staging.example.com',
    ])
    expect(result).toEqual({
      ok: true,
      origins: ['https://app.example.com', 'https://staging.example.com'],
    })
  })

  it('ignores empty rows from a form', () => {
    expect(parseOrigins(['https://app.example.com', '', '  '])).toEqual({
      ok: true,
      origins: ['https://app.example.com'],
    })
  })

  it('needs at least one address', () => {
    expect(parseOrigins([]).ok).toBe(false)
    expect(parseOrigins(['   ']).ok).toBe(false)
  })

  it('reports the first address that is wrong', () => {
    const result = parseOrigins(['https://app.example.com', 'not an address'])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('not an address')
  })

  it('refuses an implausibly long list', () => {
    const many = Array.from({ length: 11 }, (_, i) => `https://app${i}.example.com`)
    expect(parseOrigins(many).ok).toBe(false)
  })
})

describe('isAllowedOrigin', () => {
  const origins = ['https://app.example.com', 'http://localhost:5174']

  it('recognises a registered origin however it is written', () => {
    expect(isAllowedOrigin(origins, 'https://App.Example.com/')).toBe(true)
  })

  it('rejects one that was never registered', () => {
    expect(isAllowedOrigin(origins, 'https://evil.example.com')).toBe(false)
  })

  it('treats a different port as a different origin', () => {
    expect(isAllowedOrigin(origins, 'http://localhost:3000')).toBe(false)
  })

  it('rejects nonsense without throwing', () => {
    expect(isAllowedOrigin(origins, 'not an origin')).toBe(false)
  })
})
