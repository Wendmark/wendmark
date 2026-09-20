import type { Target } from '@wendmark/core'
import { describe, expect, it } from 'vitest'
import { collectCandidates } from './candidates'
import { byId, renderPick } from './test-utils'

const base: Target = { selectors: ['#nothing-here'] }

describe('collectCandidates', () => {
  it('nominates what a selector matches', () => {
    const el = renderPick('<button data-pick id="save">Save changes</button>')
    const candidates = collectCandidates({ selectors: ['#save'] }, document)
    expect(candidates).toContain(el)
  })

  it('nominates by test id, whatever attribute now holds it', () => {
    // Recorded from data-testid; the app has since switched to data-qa.
    const el = renderPick('<button data-pick data-qa="save-profile">Save</button>')
    const candidates = collectCandidates({ ...base, testId: 'save-profile' }, document)
    expect(candidates).toContain(el)
  })

  it('nominates by accessible name when the selectors are dead', () => {
    const el = renderPick(`
      <div>
        <button data-pick class="brand-new-class">Save changes</button>
        <p>Some unrelated paragraph</p>
      </div>
    `)
    const candidates = collectCandidates({ ...base, name: 'Save changes' }, document)
    expect(candidates).toContain(el)
  })

  it('nominates by visible text', () => {
    const el = renderPick('<a data-pick href="/orders">Orders</a>')
    const candidates = collectCandidates({ ...base, text: 'Orders' }, document)
    expect(candidates).toContain(el)
  })

  it('nominates an element whose text merely contains the recorded text', () => {
    const el = renderPick('<button data-pick>Save changes now</button>')
    const candidates = collectCandidates({ ...base, text: 'Save changes' }, document)
    expect(candidates).toContain(el)
  })

  it('leaves out elements that match nothing', () => {
    renderPick('<div><button data-pick>Save</button><button id="other">Cancel</button></div>')
    const candidates = collectCandidates({ selectors: ['#nope'], name: 'Save' }, document)
    expect(candidates).not.toContain(byId('other'))
  })

  it('returns each element once, however many clues nominate it', () => {
    const el = renderPick('<button data-pick id="save" data-testid="save">Save</button>')
    const candidates = collectCandidates(
      { selectors: ['#save', 'button'], testId: 'save', name: 'Save', text: 'Save' },
      document,
    )
    expect(candidates.filter((c) => c === el)).toHaveLength(1)
  })

  it('searches only inside the given root', () => {
    renderPick(`
      <section id="one"><button>Save</button></section>
      <section id="two"><button data-pick>Save</button></section>
    `)
    const candidates = collectCandidates({ ...base, name: 'Save' }, byId('two'))
    expect(candidates).toHaveLength(1)
  })

  it('ignores a broken selector instead of throwing', () => {
    const el = renderPick('<button data-pick>Save</button>')
    const candidates = collectCandidates(
      { selectors: ['>>> not a selector'], name: 'Save' },
      document,
    )
    expect(candidates).toContain(el)
  })

  it('stops after a sane number of candidates', () => {
    const many = Array.from({ length: 400 }, () => '<button>Save</button>').join('')
    renderPick(`<div data-pick>${many}</div>`)
    expect(collectCandidates({ ...base, name: 'Save' }, document).length).toBeLessThanOrEqual(200)
  })

  it('returns nothing when the target has no usable clues left', () => {
    renderPick('<button data-pick>Save</button>')
    expect(collectCandidates({ selectors: ['#gone'] }, document)).toEqual([])
  })
})
