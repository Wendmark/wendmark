import { describe, expect, it } from 'vitest'
import { appliesTo, MAX_PATTERNS, parsePatterns, pathOf, patternMatches } from './targeting'

describe('pathOf', () => {
  it('takes the path from a full address', () => {
    expect(pathOf('https://app.example.com/orders')).toBe('/orders')
  })

  it('ignores the query string and the hash', () => {
    expect(pathOf('https://app.example.com/orders?page=2#top')).toBe('/orders')
  })

  it('accepts a path on its own', () => {
    expect(pathOf('/orders/10421')).toBe('/orders/10421')
  })

  it('has nothing to say about an empty address', () => {
    expect(pathOf('')).toBeNull()
    expect(pathOf('   ')).toBeNull()
  })
})

describe('patternMatches', () => {
  it('matches the same path', () => {
    expect(patternMatches('/orders', '/orders')).toBe(true)
  })

  it('ignores a trailing slash on either side', () => {
    expect(patternMatches('/orders/', '/orders')).toBe(true)
    expect(patternMatches('/orders', '/orders/')).toBe(true)
  })

  it('does not match a different path', () => {
    expect(patternMatches('/orders', '/profile')).toBe(false)
  })

  it('does not match a deeper path by accident', () => {
    expect(patternMatches('/orders', '/orders/10421')).toBe(false)
  })

  it('matches one segment with *', () => {
    expect(patternMatches('/orders/*', '/orders/10421')).toBe(true)
    expect(patternMatches('/orders/*', '/orders')).toBe(false)
    expect(patternMatches('/orders/*', '/orders/10421/items')).toBe(false)
  })

  it('matches the rest with **', () => {
    expect(patternMatches('/orders/**', '/orders')).toBe(true)
    expect(patternMatches('/orders/**', '/orders/10421')).toBe(true)
    expect(patternMatches('/orders/**', '/orders/10421/items')).toBe(true)
    expect(patternMatches('/orders/**', '/profile')).toBe(false)
  })

  it('matches everything with ** alone', () => {
    expect(patternMatches('/**', '/anything/at/all')).toBe(true)
  })

  it('matches the site root', () => {
    expect(patternMatches('/', '/')).toBe(true)
    expect(patternMatches('/', '/orders')).toBe(false)
  })
})

describe('appliesTo', () => {
  it('applies everywhere when no page was named', () => {
    expect(appliesTo([], '/anywhere')).toBe(true)
  })

  it('applies where one of its patterns matches', () => {
    expect(appliesTo(['/profile', '/orders/**'], '/orders/10421')).toBe(true)
  })

  it('does not apply where none match', () => {
    expect(appliesTo(['/profile', '/orders/**'], '/shop')).toBe(false)
  })

  it('applies when the snippet did not say where it is', () => {
    // Better to offer a process that might not belong here than to hide one
    // that does: the player says so when the page is wrong.
    expect(appliesTo(['/profile'], null)).toBe(true)
  })

  it('applies when the address cannot be read', () => {
    expect(appliesTo(['/profile'], '')).toBe(true)
  })
})

describe('parsePatterns', () => {
  it('keeps the rules an author typed', () => {
    const result = parsePatterns(['/orders', '/profile'])
    expect(result).toEqual({ ok: true, patterns: ['/orders', '/profile'] })
  })

  it('accepts wildcards', () => {
    expect(parsePatterns(['/orders/*', '/orders/**'])).toEqual({
      ok: true,
      patterns: ['/orders/*', '/orders/**'],
    })
  })

  it('ignores blank lines and repeats', () => {
    expect(parsePatterns(['/orders', '', '  ', '/orders'])).toEqual({
      ok: true,
      patterns: ['/orders'],
    })
  })

  it('means everywhere when nothing was typed', () => {
    expect(parsePatterns([])).toEqual({ ok: true, patterns: [] })
    expect(parsePatterns(['  '])).toEqual({ ok: true, patterns: [] })
  })

  it('refuses a full address, and says what to write instead', () => {
    const result = parsePatterns(['https://app.example.com/orders'])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('/orders')
  })

  it('refuses a path that does not start with a slash', () => {
    expect(parsePatterns(['orders']).ok).toBe(false)
  })

  it('refuses a query string or a hash', () => {
    expect(parsePatterns(['/orders?page=2']).ok).toBe(false)
    expect(parsePatterns(['/orders#top']).ok).toBe(false)
  })

  it('refuses something reaching for a regular expression', () => {
    // Patterns are matched on every config request, so an expression that
    // backtracks badly would be a way to make the server work very hard.
    expect(parsePatterns(['/orders/(a|b)+*']).ok).toBe(false)
    expect(parsePatterns(['/order*']).ok).toBe(false)
  })

  it('refuses more rules than anyone means to write', () => {
    const many = Array.from({ length: MAX_PATTERNS + 1 }, (_, index) => `/page${index}`)
    expect(parsePatterns(many).ok).toBe(false)
  })
})
