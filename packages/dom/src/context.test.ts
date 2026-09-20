import { describe, expect, it } from 'vitest'
import { getContext } from './context'
import { renderPick } from './test-utils'

describe('getContext', () => {
  it('uses the heading of the section the element sits in', () => {
    const el = renderPick(`
      <section>
        <h1>My tastings</h1>
        <button data-pick>Add a tasting note</button>
      </section>
    `)
    expect(getContext(el)).toBe('My tastings')
  })

  it('prefers an aria-label on the container', () => {
    const el = renderPick(`
      <section aria-label="Delivery address">
        <h2>Address</h2>
        <button data-pick>Save</button>
      </section>
    `)
    expect(getContext(el)).toBe('Delivery address')
  })

  it('uses the nearest container, not the outermost', () => {
    const el = renderPick(`
      <main>
        <h1>Profile</h1>
        <section>
          <h2>Delivery address</h2>
          <button data-pick>Save</button>
        </section>
      </main>
    `)
    expect(getContext(el)).toBe('Delivery address')
  })

  it('uses a fieldset legend', () => {
    const el = renderPick(`
      <form>
        <fieldset>
          <legend>Grind</legend>
          <input data-pick type="radio">
        </fieldset>
      </form>
    `)
    expect(getContext(el)).toBe('Grind')
  })

  it('uses the label of a navigation region', () => {
    const el = renderPick(`
      <nav aria-label="Main">
        <a data-pick href="/orders">Orders</a>
      </nav>
    `)
    expect(getContext(el)).toBe('Main')
  })

  it('uses the heading of a dialog', () => {
    const el = renderPick(`
      <dialog>
        <h2>Cancel subscription</h2>
        <button data-pick>Confirm</button>
      </dialog>
    `)
    expect(getContext(el)).toBe('Cancel subscription')
  })

  it('ignores plain wrappers with no heading', () => {
    const el = renderPick('<div><div><button data-pick>Save</button></div></div>')
    expect(getContext(el)).toBeNull()
  })

  it('collapses whitespace in a heading', () => {
    const el = renderPick(`
      <section>
        <h2>
          My
          tastings
        </h2>
        <button data-pick>Add</button>
      </section>
    `)
    expect(getContext(el)).toBe('My tastings')
  })

  it('cuts a very long heading to the schema limit', () => {
    const el = renderPick(`
      <section>
        <h2>${'context '.repeat(50)}</h2>
        <button data-pick>Save</button>
      </section>
    `)
    const context = getContext(el)
    expect(context).not.toBeNull()
    expect(context?.length).toBeLessThanOrEqual(200)
  })

  it('returns null when nothing around the element names it', () => {
    const el = renderPick('<button data-pick>Save</button>')
    expect(getContext(el)).toBeNull()
  })
})
