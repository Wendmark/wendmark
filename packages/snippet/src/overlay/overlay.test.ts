import { afterEach, describe, expect, it } from 'vitest'
import { OVERLAY_TAG, createOverlay } from './overlay'

let overlays: { destroy: () => void }[] = []

/** Create an overlay and make sure it is cleaned up after the test. */
function create() {
  const overlay = createOverlay(document)
  overlays.push(overlay)
  return overlay
}

afterEach(() => {
  for (const overlay of overlays) overlay.destroy()
  overlays = []
  document.body.innerHTML = ''
})

describe('createOverlay', () => {
  it('adds a single host element to the page', () => {
    create()
    expect(document.querySelectorAll(OVERLAY_TAG)).toHaveLength(1)
  })

  it('puts its UI in an open shadow root', () => {
    const overlay = create()
    expect(overlay.root).toBeInstanceOf(ShadowRoot)
    expect(document.querySelector(OVERLAY_TAG)?.shadowRoot).toBe(overlay.root)
  })

  it('lets clicks pass through to the page', () => {
    create()
    const host = document.querySelector(OVERLAY_TAG) as HTMLElement
    expect(host.style.pointerEvents).toBe('none')
  })

  it('covers the viewport above everything else', () => {
    create()
    const host = document.querySelector(OVERLAY_TAG) as HTMLElement
    expect(host.style.position).toBe('fixed')
    expect(host.style.zIndex).toBe('2147483647')
  })

  it('resets inherited styles inside the shadow root', () => {
    const overlay = create()
    const css = overlay.root.querySelector('style')?.textContent ?? ''
    expect(css).toContain(':host')
    expect(css).toContain('all: initial')
  })

  it('adds nothing to the page outside its own host', () => {
    const before = document.head.innerHTML
    create()
    expect(document.head.innerHTML).toBe(before)
    expect(document.body.innerHTML).toBe('')
  })

  it('leaves no trace after destroy', () => {
    const overlay = createOverlay(document)
    overlay.destroy()
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('can be destroyed twice without complaining', () => {
    const overlay = createOverlay(document)
    overlay.destroy()
    expect(() => overlay.destroy()).not.toThrow()
  })

  it('survives being used on a page that already has our tag name', () => {
    document.body.innerHTML = `<${OVERLAY_TAG}></${OVERLAY_TAG}>`
    const overlay = create()
    expect(overlay.root).toBeInstanceOf(ShadowRoot)
  })
})
