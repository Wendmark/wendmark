import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createCursor, cursorPoint, prefersReducedMotion } from './cursor'
import { createOverlay, type Overlay } from './overlay'
import { setRect } from '../test-utils'

let overlay: Overlay

beforeEach(() => {
  overlay = createOverlay(document)
})

afterEach(() => {
  overlay.destroy()
  document.body.innerHTML = ''
})

/** The cursor element inside the shadow root, if it is there. */
function cursorElement(): HTMLElement | null {
  return overlay.root.querySelector('[data-wendmark="cursor"]')
}

describe('createCursor', () => {
  it('adds a cursor to the overlay', () => {
    createCursor(overlay.root, document)
    expect(cursorElement()).not.toBeNull()
  })

  it('stays hidden until it is needed', () => {
    createCursor(overlay.root, document)
    expect(cursorElement()?.style.display).toBe('none')
  })

  it('draws a pointer shape rather than a character', () => {
    createCursor(overlay.root, document)
    expect(cursorElement()?.querySelector('svg')).not.toBeNull()
    expect(cursorElement()?.querySelector('path')).not.toBeNull()
  })

  it('shows and hides on request', () => {
    const cursor = createCursor(overlay.root, document)
    cursor.moveTo(120, 240)
    expect(cursorElement()?.style.display).not.toBe('none')
    cursor.hide()
    expect(cursorElement()?.style.display).toBe('none')
  })

  it('sits where it is told, in viewport coordinates', () => {
    const cursor = createCursor(overlay.root, document)
    cursor.moveTo(120, 240)
    expect(cursorElement()?.style.left).toBe('120px')
    expect(cursorElement()?.style.top).toBe('240px')
    // Fixed positioning comes from the stylesheet, so coordinates are viewport ones.
    expect(overlay.root.textContent).toContain('position: fixed')
  })

  it('never swallows a click meant for the page', () => {
    createCursor(overlay.root, document)
    expect(overlay.root.textContent).toContain('pointer-events: none')
  })

  it('keeps everything inside the shadow root', () => {
    const before = document.head.innerHTML
    createCursor(overlay.root, document)
    expect(document.head.innerHTML).toBe(before)
    expect(document.body.innerHTML).toBe('')
  })

  it('removes itself on destroy', () => {
    const cursor = createCursor(overlay.root, document)
    cursor.destroy()
    expect(cursorElement()).toBeNull()
  })

  it('points at an element, tip in its middle', () => {
    document.body.innerHTML = '<button id="b">Save changes</button>'
    const button = document.getElementById('b') as Element
    setRect(button, { left: 100, top: 200, width: 120, height: 40 })

    const cursor = createCursor(overlay.root, document)
    cursor.pointAt(button, window)

    expect(cursorElement()?.style.left).toBe('160px')
    expect(cursorElement()?.style.top).toBe('220px')
  })
})

describe('cursorPoint', () => {
  const viewport = { width: 1000, height: 800 }

  it('is the middle of the target', () => {
    const point = cursorPoint({ left: 100, top: 200, width: 120, height: 40 }, viewport)
    expect(point).toEqual({ x: 160, y: 220 })
  })

  it('stays on screen when the target is above the fold', () => {
    const point = cursorPoint({ left: 100, top: -300, width: 120, height: 40 }, viewport)
    expect(point.y).toBeGreaterThanOrEqual(0)
    expect(point.y).toBeLessThan(40)
  })

  it('stays on screen when the target is off to the right', () => {
    const point = cursorPoint({ left: 1400, top: 200, width: 120, height: 40 }, viewport)
    expect(point.x).toBeLessThanOrEqual(viewport.width)
    expect(point.x).toBeGreaterThan(viewport.width - 40)
  })

  it('stays on screen when the target is below the fold', () => {
    const point = cursorPoint({ left: 100, top: 2000, width: 120, height: 40 }, viewport)
    expect(point.y).toBeLessThanOrEqual(viewport.height)
  })

  it('handles a target larger than the window', () => {
    const point = cursorPoint({ left: -50, top: -50, width: 2000, height: 1600 }, viewport)
    expect(point.x).toBeGreaterThan(0)
    expect(point.x).toBeLessThan(viewport.width)
    expect(point.y).toBeGreaterThan(0)
    expect(point.y).toBeLessThan(viewport.height)
  })
})

describe('the label chip', () => {
  it('says "Click here" by default', () => {
    createCursor(overlay.root, document)
    expect(overlay.root.querySelector('[data-wendmark="chip"]')?.textContent).toBe('Click here')
  })

  it("can be given the step's own wording", () => {
    const cursor = createCursor(overlay.root, document)
    cursor.setLabel('Click Save changes')
    expect(overlay.root.querySelector('[data-wendmark="chip"]')?.textContent).toBe(
      'Click Save changes',
    )
  })

  it('sits to the right of the cursor normally', () => {
    document.body.innerHTML = '<button id="b">Save</button>'
    const button = document.getElementById('b') as Element
    setRect(button, { left: 100, top: 200, width: 120, height: 40 })
    const cursor = createCursor(overlay.root, document)
    cursor.pointAt(button, window)
    expect(cursorElement()?.classList.contains('is-flipped')).toBe(false)
  })

  it('flips to the left when the target is near the right edge', () => {
    document.body.innerHTML = '<button id="b">Save</button>'
    const button = document.getElementById('b') as Element
    setRect(button, { left: window.innerWidth - 60, top: 200, width: 50, height: 40 })
    const cursor = createCursor(overlay.root, document)
    cursor.pointAt(button, window)
    expect(cursorElement()?.classList.contains('is-flipped')).toBe(true)
  })
})

describe('how the cursor moves', () => {
  function button(rect = { left: 100, top: 200, width: 120, height: 40 }): Element {
    document.body.innerHTML = '<button id="b">Save</button>'
    const element = document.getElementById('b') as Element
    setRect(element, rect)
    return element
  }

  it('glides to a new target by default', () => {
    const cursor = createCursor(overlay.root, document)
    cursor.pointAt(button(), window)
    expect(cursorElement()?.classList.contains('is-gliding')).toBe(true)
    expect(cursorElement()?.style.left).toBe('160px')
  })

  it('does not animate while following a moving page', () => {
    const cursor = createCursor(overlay.root, document)
    const target = button()
    cursor.pointAt(target, window)

    setRect(target, { left: 100, top: 40, width: 120, height: 40 })
    cursor.pointAt(target, window, { glide: false })

    expect(cursorElement()?.classList.contains('is-gliding')).toBe(false)
    expect(cursorElement()?.style.top).toBe('60px')
  })

  it('enters from the bottom of the screen the first time', () => {
    const cursor = createCursor(overlay.root, document)
    let seenFromBottom = false
    const element = cursorElement() as HTMLElement
    // Watch the position the entrance starts from.
    const observer = new MutationObserver(() => {
      if (element.style.top === `${window.innerHeight - 60}px`) seenFromBottom = true
    })
    observer.observe(element, { attributes: true, attributeFilter: ['style'] })

    cursor.pointAt(button(), window)
    observer.disconnect()
    expect(seenFromBottom || element.style.top === '220px').toBe(true)
  })
})

describe('reduced motion', () => {
  /** A window that reports the given prefers-reduced-motion answer. */
  function windowWith(reduce: boolean): Window {
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      matchMedia: (query: string) => ({ matches: reduce && query.includes('reduce') }),
    } as unknown as Window
  }

  it("reads the user's system setting", () => {
    expect(prefersReducedMotion(windowWith(true))).toBe(true)
    expect(prefersReducedMotion(windowWith(false))).toBe(false)
  })

  it('assumes motion is fine when the browser cannot say', () => {
    expect(prefersReducedMotion({} as Window)).toBe(false)
  })

  it('does not animate for someone who asked for less motion', () => {
    document.body.innerHTML = '<button id="b">Save</button>'
    const target = document.getElementById('b') as Element
    setRect(target, { left: 100, top: 200, width: 120, height: 40 })

    const cursor = createCursor(overlay.root, document)
    cursor.pointAt(target, windowWith(true))

    expect(cursorElement()?.classList.contains('is-gliding')).toBe(false)
    // It still ends up in exactly the right place.
    expect(cursorElement()?.style.left).toBe('160px')
    expect(cursorElement()?.style.top).toBe('220px')
  })
})
