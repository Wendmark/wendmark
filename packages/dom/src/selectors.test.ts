import { describe, expect, it } from 'vitest'
import { buildSelectors } from './selectors'
import { renderPick } from './test-utils'

/** Every selector must match the element, and only it. */
function expectAllUnique(selectors: string[], element: Element): void {
  expect(selectors.length).toBeGreaterThan(0)
  for (const selector of selectors) {
    const found = document.querySelectorAll(selector)
    expect(found, selector).toHaveLength(1)
    expect(found[0], selector).toBe(element)
  }
}

describe('buildSelectors', () => {
  it('prefers a test id', () => {
    const el = renderPick('<button data-pick data-testid="save-profile">Save</button>')
    expect(buildSelectors(el)[0]).toBe('[data-testid="save-profile"]')
    expectAllUnique(buildSelectors(el), el)
  })

  it('uses a stable id', () => {
    const el = renderPick('<input data-pick id="email" type="email">')
    expect(buildSelectors(el)[0]).toBe('#email')
  })

  it('ignores a generated id', () => {
    const el = renderPick('<button data-pick id="react-aria-3f9a">Save</button>')
    expect(buildSelectors(el).join(' ')).not.toContain('react-aria')
    expectAllUnique(buildSelectors(el), el)
  })

  it('pins the first of several look-alikes to its place, not only the later ones', () => {
    // A problem report keeps no labels, so `nav > a.nav-link` would be every
    // link in the nav, with nothing left to tell them apart.
    const el = renderPick(
      '<div id="root"><nav><a data-pick class="nav-link" href="/">Shop</a><a class="nav-link" href="/orders">Orders</a></nav></div>',
    )
    const selectors = buildSelectors(el)
    expect(selectors.join(' ')).toContain('a.nav-link:nth-of-type(1)')
    expectAllUnique(selectors, el)
  })

  it('ignores generated classes', () => {
    const el = renderPick('<main><button data-pick class="css-1x2y3z btn">Save</button></main>')
    const selectors = buildSelectors(el)
    expect(selectors.join(' ')).not.toContain('css-1x2y3z')
    expect(selectors.join(' ')).toContain('.btn')
    expectAllUnique(selectors, el)
  })

  it('builds a structural selector when there is nothing else', () => {
    const el = renderPick(
      '<form class="form"><span>Hi</span><button data-pick>Save</button></form>',
    )
    expectAllUnique(buildSelectors(el), el)
  })

  it('tells identical siblings apart', () => {
    const el = renderPick(`
      <ul class="list">
        <li><button>Add</button></li>
        <li><button data-pick>Add</button></li>
        <li><button>Add</button></li>
      </ul>
    `)
    expectAllUnique(buildSelectors(el), el)
  })

  it('anchors on an ancestor with a stable id', () => {
    // The same shape appears twice, so no short structural selector is unique.
    const el = renderPick(`
      <section id="profile-form">
        <div><div><button data-pick>Save</button></div></div>
      </section>
      <section id="billing-form">
        <div><div><button>Save</button></div></div>
      </section>
    `)
    const selectors = buildSelectors(el)
    expect(selectors.some((s) => s.startsWith('#profile-form'))).toBe(true)
    expectAllUnique(selectors, el)
  })

  it('escapes characters that have meaning in a selector', () => {
    const el = renderPick('<button data-pick data-testid="save.profile">Save</button>')
    expectAllUnique(buildSelectors(el), el)
  })

  it('returns at most three selectors, without duplicates', () => {
    const el = renderPick('<button data-pick id="save" data-testid="save">Save</button>')
    const selectors = buildSelectors(el)
    expect(selectors.length).toBeLessThanOrEqual(3)
    expect(new Set(selectors).size).toBe(selectors.length)
  })

  it('always returns something, even for a deeply buried element', () => {
    const el = renderPick(`
      <div><div><div><div><div><div><div><div>
        <span data-pick>Deep</span>
      </div></div></div></div></div></div></div></div>
    `)
    expect(buildSelectors(el).length).toBeGreaterThan(0)
  })
})
