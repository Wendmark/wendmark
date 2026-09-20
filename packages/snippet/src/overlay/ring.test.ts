import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createOverlay, type Overlay } from './overlay'
import { RING_PADDING, createRing } from './ring'
import { renderPick, setRect } from '../test-utils'

let overlay: Overlay

beforeEach(() => {
  overlay = createOverlay(document)
})

afterEach(() => {
  overlay.destroy()
  document.body.innerHTML = ''
})

/** The ring element inside the shadow root, if it is there. */
function ringElement(): HTMLElement | null {
  return overlay.root.querySelector('[data-wendmark="ring"]')
}

describe('createRing', () => {
  it('draws nothing until it is shown', () => {
    createRing(overlay.root, document)
    expect(ringElement()?.style.display).toBe('none')
  })

  it('frames the target, with a little breathing room', () => {
    const button = renderPick('<button data-pick>Save changes</button>')
    setRect(button, { left: 100, top: 200, width: 120, height: 40 })

    const ring = createRing(overlay.root, document)
    ring.show(button)

    const box = ringElement()
    expect(box?.style.left).toBe(`${100 - RING_PADDING}px`)
    expect(box?.style.top).toBe(`${200 - RING_PADDING}px`)
    expect(box?.style.width).toBe(`${120 + RING_PADDING * 2}px`)
    expect(box?.style.height).toBe(`${40 + RING_PADDING * 2}px`)
    expect(box?.style.display).not.toBe('none')
  })

  it('follows the target when it moves', () => {
    const button = renderPick('<button data-pick>Save changes</button>')
    setRect(button, { left: 100, top: 200, width: 120, height: 40 })

    const ring = createRing(overlay.root, document)
    ring.show(button)

    setRect(button, { left: 100, top: 40, width: 120, height: 40 })
    ring.update()

    expect(ringElement()?.style.top).toBe(`${40 - RING_PADDING}px`)
  })

  it('hides again on request', () => {
    const button = renderPick('<button data-pick>Save</button>')
    const ring = createRing(overlay.root, document)
    ring.show(button)
    ring.hide()
    expect(ringElement()?.style.display).toBe('none')
  })

  it('never swallows a click meant for the page', () => {
    createRing(overlay.root, document)
    const css = overlay.root.textContent ?? ''
    expect(css).toContain('pointer-events: none')
  })

  it('keeps its styles inside the shadow root', () => {
    const before = document.head.innerHTML
    createRing(overlay.root, document)
    expect(document.head.innerHTML).toBe(before)
    expect(overlay.root.querySelectorAll('style').length).toBeGreaterThan(0)
  })

  it('goes away with the overlay', () => {
    const ring = createRing(overlay.root, document)
    ring.destroy()
    expect(ringElement()).toBeNull()
  })

  it('does nothing harmful when shown an element that is gone', () => {
    const button = renderPick('<button data-pick>Save</button>')
    const ring = createRing(overlay.root, document)
    button.remove()
    expect(() => ring.show(button)).not.toThrow()
    expect(ringElement()?.style.display).toBe('none')
  })
})
