import type { Target } from '@wendmark/core'
import { describe, expect, it } from 'vitest'
import { scoreCandidate } from './score'
import { byId, renderPick } from './test-utils'

const saveButton: Target = {
  selectors: ['#save'],
  testId: 'save-profile',
  role: 'button',
  name: 'Save changes',
  text: 'Save changes',
  context: 'Delivery address',
}

describe('scoreCandidate', () => {
  it('scores a perfect match highest', () => {
    const el = renderPick(`
      <section>
        <h2>Delivery address</h2>
        <button data-pick id="save" data-testid="save-profile">Save changes</button>
      </section>
    `)
    const perfect = scoreCandidate(saveButton, el)
    expect(perfect).toBeGreaterThan(10)
  })

  it('scores an unrelated element at zero', () => {
    const el = renderPick('<p data-pick>Freshly roasted, delivered to your door.</p>')
    expect(scoreCandidate(saveButton, el)).toBe(0)
  })

  it('accepts an element found only by its test id', () => {
    const el = renderPick('<button data-pick data-qa="save-profile">Spara ändringar</button>')
    expect(scoreCandidate(saveButton, el)).toBeGreaterThanOrEqual(6)
  })

  it('prefers the element that says the right thing over a drifted selector', () => {
    renderPick(`
      <form>
        <button id="save">Cancel</button>
        <button id="new-save" data-pick class="btn">Save changes</button>
      </form>
    `)
    const drifted = scoreCandidate({ selectors: ['#save'], name: 'Save changes' }, byId('save'))
    const correct = scoreCandidate({ selectors: ['#save'], name: 'Save changes' }, byId('new-save'))
    expect(correct).toBeGreaterThan(drifted)
  })

  it('penalises a selector match whose text disagrees', () => {
    renderPick('<button data-pick id="save">Cancel</button>')
    const withName = scoreCandidate({ selectors: ['#save'], name: 'Save changes' }, byId('save'))
    const withoutName = scoreCandidate({ selectors: ['#save'] }, byId('save'))
    expect(withName).toBeLessThan(withoutName)
  })

  it('gives a partial text match less than an exact one', () => {
    renderPick(`
      <div>
        <button id="exact" data-pick>Save changes</button>
        <button id="partial">Save changes and close</button>
      </div>
    `)
    const target: Target = { selectors: ['#gone'], text: 'Save changes' }
    expect(scoreCandidate(target, byId('exact'))).toBeGreaterThan(
      scoreCandidate(target, byId('partial')),
    )
  })

  it('adds a point for a matching role', () => {
    renderPick('<button data-pick>Save changes</button>')
    const el = document.querySelector('[data-pick]') as Element
    const withRole = scoreCandidate(
      { selectors: ['#gone'], text: 'Save changes', role: 'button' },
      el,
    )
    const withoutRole = scoreCandidate({ selectors: ['#gone'], text: 'Save changes' }, el)
    expect(withRole).toBe(withoutRole + 1)
  })

  it('adds a point for matching context', () => {
    renderPick(`
      <section><h2>Delivery address</h2><button data-pick>Save</button></section>
    `)
    const el = document.querySelector('[data-pick]') as Element
    const withContext = scoreCandidate(
      { selectors: ['#gone'], text: 'Save', context: 'Delivery address' },
      el,
    )
    const withoutContext = scoreCandidate({ selectors: ['#gone'], text: 'Save' }, el)
    expect(withContext).toBe(withoutContext + 1)
  })

  it('does not reward a context that belongs to a different section', () => {
    renderPick(`
      <section><h2>Billing address</h2><button data-pick>Save</button></section>
    `)
    const el = document.querySelector('[data-pick]') as Element
    const target: Target = { selectors: ['#gone'], text: 'Save', context: 'Delivery address' }
    expect(scoreCandidate(target, el)).toBe(
      scoreCandidate({ selectors: ['#gone'], text: 'Save' }, el),
    )
  })
})
