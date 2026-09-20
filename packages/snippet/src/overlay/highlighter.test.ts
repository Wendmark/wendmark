import { afterEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from './overlay'
import { createHighlighter, type Highlighter } from './highlighter'
import { RING_PADDING } from './ring'
import { POLL_MS } from './track'
import { setRect } from '../test-utils'

let highlighter: Highlighter | null = null

function create(onLost?: (element: Element) => void): Highlighter {
  highlighter = createHighlighter(document, window, onLost ? { onLost } : {})
  return highlighter
}

/** Two buttons on a page, each with a known position. */
function twoButtons(): [Element, Element] {
  document.body.innerHTML = '<button id="a">Save</button><button id="b">Cancel</button>'
  const a = document.getElementById('a') as Element
  const b = document.getElementById('b') as Element
  setRect(a, { left: 10, top: 10, width: 100, height: 30 })
  setRect(b, { left: 10, top: 80, width: 100, height: 30 })
  return [a, b]
}

function ringStyle(): CSSStyleDeclaration {
  const box = document
    .querySelector(OVERLAY_TAG)
    ?.shadowRoot?.querySelector('[data-wendmark="ring"]')
  if (!box) throw new Error('no ring in the overlay')
  return (box as HTMLElement).style
}

afterEach(() => {
  highlighter?.destroy()
  highlighter = null
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('createHighlighter', () => {
  it('rings the element it is given', () => {
    const [a] = twoButtons()
    create().highlight(a)
    expect(ringStyle().top).toBe(`${10 - RING_PADDING}px`)
  })

  it('follows that element as the page moves', () => {
    vi.useFakeTimers()
    const [a] = twoButtons()
    create().highlight(a)
    setRect(a, { left: 10, top: 500, width: 100, height: 30 })
    vi.advanceTimersByTime(POLL_MS)
    expect(ringStyle().top).toBe(`${500 - RING_PADDING}px`)
  })

  it('moves to a new element and forgets the old one', () => {
    vi.useFakeTimers()
    const [a, b] = twoButtons()
    const h = create()
    h.highlight(a)
    h.highlight(b)
    expect(ringStyle().top).toBe(`${80 - RING_PADDING}px`)

    // The old element moving must no longer drag the ring around.
    setRect(a, { left: 10, top: 900, width: 100, height: 30 })
    vi.advanceTimersByTime(POLL_MS)
    expect(ringStyle().top).toBe(`${80 - RING_PADDING}px`)
  })

  it('hides the ring and says so when the target disappears', () => {
    vi.useFakeTimers()
    const [a] = twoButtons()
    const onLost = vi.fn()
    create(onLost).highlight(a)
    a.remove()
    vi.advanceTimersByTime(POLL_MS * 3)
    expect(onLost).toHaveBeenCalledWith(a)
    expect(ringStyle().display).toBe('none')
  })

  it('clears on request', () => {
    const [a] = twoButtons()
    const h = create()
    h.highlight(a)
    h.clear()
    expect(ringStyle().display).toBe('none')
  })

  it('leaves the page as it found it', () => {
    const [a] = twoButtons()
    const before = document.body.innerHTML
    const h = create()
    h.highlight(a)
    h.destroy()
    highlighter = null
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
    expect(document.body.innerHTML).toBe(before)
  })

  it('stops tracking after destroy', () => {
    vi.useFakeTimers()
    const [a] = twoButtons()
    const onLost = vi.fn()
    const h = create(onLost)
    h.highlight(a)
    h.destroy()
    highlighter = null
    a.remove()
    vi.advanceTimersByTime(POLL_MS * 3)
    expect(onLost).not.toHaveBeenCalled()
  })
})
