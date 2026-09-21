import { describe, expect, it } from 'vitest'
import { isProbablyVisible } from './visible'
import { renderPick } from './test-utils'

describe('isProbablyVisible', () => {
  it('accepts an ordinary element', () => {
    expect(isProbablyVisible(renderPick('<button data-pick>Save</button>'))).toBe(true)
  })

  it('rejects display: none', () => {
    expect(isProbablyVisible(renderPick('<button data-pick style="display:none">S</button>'))).toBe(
      false,
    )
  })

  it('rejects visibility: hidden', () => {
    const el = renderPick('<button data-pick style="visibility:hidden">S</button>')
    expect(isProbablyVisible(el)).toBe(false)
  })

  it('rejects the hidden attribute', () => {
    expect(isProbablyVisible(renderPick('<button data-pick hidden>S</button>'))).toBe(false)
  })

  it('rejects an element inside a hidden container', () => {
    const el = renderPick('<div style="display:none"><button data-pick>S</button></div>')
    expect(isProbablyVisible(el)).toBe(false)
  })

  it('rejects anything marked aria-hidden', () => {
    const el = renderPick('<div aria-hidden="true"><button data-pick>S</button></div>')
    expect(isProbablyVisible(el)).toBe(false)
  })

  it('rejects an element that is no longer in the page', () => {
    const el = renderPick('<button data-pick>Save</button>')
    el.remove()
    expect(isProbablyVisible(el)).toBe(false)
  })

  it('rejects an element inside a hidden web component', () => {
    document.body.innerHTML = '<fika-form style="display:none"></fika-form>'
    const host = document.querySelector('fika-form') as Element
    host.attachShadow({ mode: 'open' }).innerHTML = '<button>Save</button>'
    const button = (host.shadowRoot as ShadowRoot).querySelector('button') as Element

    expect(isProbablyVisible(button)).toBe(false)
  })

  it('accepts an element inside a visible web component', () => {
    document.body.innerHTML = '<fika-form></fika-form>'
    const host = document.querySelector('fika-form') as Element
    host.attachShadow({ mode: 'open' }).innerHTML = '<button>Save</button>'
    const button = (host.shadowRoot as ShadowRoot).querySelector('button') as Element

    expect(isProbablyVisible(button)).toBe(true)
  })
})
