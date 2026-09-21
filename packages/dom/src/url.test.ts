import { describe, expect, it } from 'vitest'
import { prettyPath, urlMatches } from './url'

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

  it('treats a different site as different', () => {
    expect(urlMatches('https://fika.test/profile', 'https://other.test/profile')).toBe(false)
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

  it('gives back whatever it was given when that is not a URL', () => {
    expect(prettyPath('nonsense')).toBe('nonsense')
  })
})
