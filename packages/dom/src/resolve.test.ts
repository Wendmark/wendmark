import { describe, expect, it } from 'vitest'
import { resolve } from './resolve'
import { byId, renderPick } from './test-utils'

describe('resolve', () => {
  it('finds an element that still matches everything', () => {
    const el = renderPick('<button data-pick id="save" data-testid="save">Save changes</button>')
    const result = resolve(
      { selectors: ['#save'], testId: 'save', role: 'button', name: 'Save changes' },
      document,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(el)
  })

  it('finds it by meaning after the structure changed', () => {
    renderPick(`
      <section>
        <h2>Delivery address</h2>
        <div><div><button id="new-save" data-pick class="c-btn">Save changes</button></div></div>
      </section>
    `)
    const result = resolve(
      {
        selectors: ['#save', 'form > button'],
        role: 'button',
        name: 'Save changes',
        context: 'Delivery address',
      },
      document,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(byId('new-save'))
  })

  it('does not follow a drifted selector onto the wrong button', () => {
    renderPick(`
      <form>
        <button id="save">Cancel</button>
        <button id="new-save" data-pick>Save changes</button>
      </form>
    `)
    const result = resolve({ selectors: ['#save'], role: 'button', name: 'Save changes' }, document)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(byId('new-save'))
  })

  it('reports not-found when nothing is credible', () => {
    renderPick('<div data-pick><p>Nothing to see</p></div>')
    expect(resolve({ selectors: ['#gone'], name: 'Save changes' }, document).status).toBe(
      'not-found',
    )
  })

  it('reports not-found rather than guessing from a weak clue', () => {
    renderPick('<button data-pick>Save changes and close the dialog for good</button>')
    expect(resolve({ selectors: ['#gone'], text: 'Save' }, document).status).toBe('not-found')
  })

  it('reports ambiguous when several elements match equally well', () => {
    renderPick(`
      <ul data-pick class="list">
        <li><button class="pick">Choose</button></li>
        <li><button class="pick">Choose</button></li>
        <li><button class="pick">Choose</button></li>
      </ul>
    `)
    const result = resolve({ selectors: ['.pick'], role: 'button', name: 'Choose' }, document)
    expect(result.status).toBe('ambiguous')
    if (result.status === 'ambiguous') expect(result.elements).toHaveLength(3)
  })

  it('ignores hidden elements and finds the visible one', () => {
    renderPick(`
      <div>
        <button id="hidden-one" style="display:none">Save changes</button>
        <button id="visible-one" data-pick>Save changes</button>
      </div>
    `)
    const result = resolve({ selectors: ['#gone'], role: 'button', name: 'Save changes' }, document)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(byId('visible-one'))
  })

  it('prefers the innermost element when one contains the other', () => {
    renderPick('<div id="wrap" role="button"><button id="inner" data-pick>Save</button></div>')
    const result = resolve({ selectors: ['#gone'], role: 'button', name: 'Save' }, document)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(byId('inner'))
  })

  it('searches only inside the given root', () => {
    renderPick(`
      <section id="one"><button>Save changes</button></section>
      <section id="two"><button data-pick>Save changes</button></section>
    `)
    const result = resolve({ selectors: ['#gone'], name: 'Save changes' }, byId('two'))
    expect(result.status).toBe('found')
  })

  it('reports the winning score', () => {
    renderPick('<button data-pick id="save">Save changes</button>')
    const result = resolve({ selectors: ['#save'], name: 'Save changes' }, document)
    if (result.status !== 'found') throw new Error('expected a match')
    expect(result.score).toBeGreaterThanOrEqual(9)
  })
})
