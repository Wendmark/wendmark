import { describe, expect, it } from 'vitest'
import { pagePath, prettyPath, urlMatches } from './url'

describe('urlMatches', () => {
  it('matches the same page', () => {
    expect(urlMatches('https://fika.test/profile', 'https://fika.test/profile')).toBe(true)
  })

  it('ignores the query string and the hash', () => {
    expect(urlMatches('https://fika.test/orders?page=2', 'https://fika.test/orders#top')).toBe(true)
  })

  it('ignores a trailing slash', () => {
    expect(urlMatches('https://fika.test/orders/', 'https://fika.test/orders')).toBe(true)
  })

  it('treats a different page as different', () => {
    expect(urlMatches('https://fika.test/profile', 'https://fika.test/orders')).toBe(false)
  })

  it('matches the same page across environments', () => {
    // A flow recorded on a laptop has to work in production. Which app a flow
    // belongs to is decided by the portal, not by the address bar.
    expect(urlMatches('http://localhost:5174/profile', 'https://fika.test/profile')).toBe(true)
    expect(urlMatches('https://staging.fika.test/orders', 'https://fika.test/orders')).toBe(true)
  })

  it('still tells different pages apart on the same site', () => {
    expect(urlMatches('https://fika.test/profile', 'https://fika.test/orders')).toBe(false)
  })

  it('works with a stored path, not only a full address', () => {
    expect(urlMatches('/profile', 'https://fika.test/profile')).toBe(true)
    expect(urlMatches('/profile', 'https://fika.test/orders')).toBe(false)
    expect(urlMatches('/orders/10421', 'https://fika.test/orders/98765')).toBe(true)
  })

  it('treats ids in the path as wildcards', () => {
    // Recorded on one order, replayed on another: the same screen.
    expect(
      urlMatches('https://fika.test/orders/10421/items', 'https://fika.test/orders/98765/items'),
    ).toBe(true)
  })

  it('does not treat a word as a wildcard', () => {
    expect(urlMatches('https://fika.test/orders/latest', 'https://fika.test/orders/archive')).toBe(
      false,
    )
  })

  it('needs the same number of path segments', () => {
    expect(urlMatches('https://fika.test/orders/10421', 'https://fika.test/orders')).toBe(false)
  })

  it('understands hash routes', () => {
    expect(urlMatches('https://fika.test/#/orders/1', 'https://fika.test/#/orders/2')).toBe(true)
    expect(urlMatches('https://fika.test/#/orders', 'https://fika.test/#/profile')).toBe(false)
  })

  it('matches anywhere on the site when the step was recorded at its root', () => {
    // Apps that do not route by URL give us nothing to compare.
    expect(urlMatches('https://fika.test/', 'https://fika.test/profile')).toBe(true)
  })

  it('never blocks guidance on a URL it cannot read', () => {
    expect(urlMatches('not a url', 'https://fika.test/profile')).toBe(true)
    expect(urlMatches('https://fika.test/profile', 'also not a url')).toBe(true)
  })
})

describe('prettyPath', () => {
  it('is the part of the address a person would say', () => {
    expect(prettyPath('https://fika.test/profile')).toBe('/profile')
    expect(prettyPath('https://fika.test/orders/10421/items')).toBe('/orders/10421/items')
  })

  it('calls the site root the home page', () => {
    expect(prettyPath('https://fika.test/')).toBe('/')
  })

  it('includes a hash route', () => {
    expect(prettyPath('https://fika.test/#/orders')).toBe('/orders')
  })

  it('treats anything else as a path, since that is what a step stores', () => {
    expect(prettyPath('nonsense')).toBe('/nonsense')
  })
})

describe('pagePath', () => {
  it('keeps the page and drops everything environment-specific', () => {
    expect(pagePath('http://localhost:5174/profile')).toBe('/profile')
    expect(pagePath('https://fika.test/orders/10421/items')).toBe('/orders/10421/items')
  })

  it('drops the query string, which can carry data we should not keep', () => {
    expect(pagePath('https://fika.test/orders?customer=alex@example.com')).toBe('/orders')
  })

  it('keeps a hash route, because that is the page in many apps', () => {
    expect(pagePath('https://fika.test/#/orders/1')).toBe('/orders/1')
  })

  it('calls the root the root', () => {
    expect(pagePath('https://fika.test/')).toBe('/')
    expect(pagePath('')).toBe('/')
  })

  it('is what a step stores, so it round-trips with urlMatches', () => {
    const stored = pagePath('http://localhost:5174/orders/10421')
    expect(urlMatches(stored, 'https://fika.test/orders/98765')).toBe(true)
  })
})
