import { describe, expect, it } from 'vitest'
import { isStableClass, isStableId, stableClasses } from './stable'
import { renderTarget } from './test-utils'

describe('isStableId', () => {
  it.each(['email', 'save-profile', 'mp-tfa-h2', 'searchInput'])('accepts %s', (id) => {
    expect(isStableId(id)).toBe(true)
  })

  it.each([
    [':r1:', 'React useId'],
    ['__button42', 'UI5 generated id'],
    ['ember-1234', 'framework counter'],
    ['react-aria-3f9a', 'framework prefix'],
    ['order-12345', 'long digit run'],
    ['550e8400-e29b-41d4-a716', 'uuid'],
    ['header-1a2b3c', 'hashed suffix'],
    ['a', 'too short'],
    ['x'.repeat(60), 'too long'],
    ['', 'empty'],
  ])('rejects %s (%s)', (id) => {
    expect(isStableId(id)).toBe(false)
  })
})

describe('isStableClass', () => {
  it.each(['card', 'nav-link', 'btn--primary'])('accepts %s', (className) => {
    expect(isStableClass(className)).toBe(true)
  })

  it.each(['css-1x2y3z', 'sc-bdVaJa', 'jss-42x', 'x'.repeat(60)])('rejects %s', (className) => {
    expect(isStableClass(className)).toBe(false)
  })
})

describe('stableClasses', () => {
  it('keeps only the stable classes, in order', () => {
    const el = renderTarget('<div id="target" class="card css-1x2y3z card-body sc-bdVaJa"></div>')
    expect(stableClasses(el)).toEqual(['card', 'card-body'])
  })

  it('returns an empty array when the element has no classes', () => {
    const el = renderTarget('<div id="target"></div>')
    expect(stableClasses(el)).toEqual([])
  })

  it('keeps at most four classes', () => {
    const el = renderTarget('<div id="target" class="a1 b2 c3 d4 e5 f6"></div>')
    expect(stableClasses(el)).toEqual(['a1', 'b2', 'c3', 'd4'])
  })
})
