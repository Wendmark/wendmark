import { afterEach, describe, expect, it, vi } from 'vitest'
import { isInView, scrollIntoViewIfNeeded } from './scroll'
import { renderPick, setRect } from '../test-utils'

/** An element with a known position, and a spy on scrollIntoView. */
function target(rect: { left: number; top: number; width: number; height: number }) {
  const element = renderPick('<button data-pick>Save changes</button>')
  setRect(element, rect)
  const scrollIntoView = vi.fn<(options?: ScrollIntoViewOptions) => void>()
  element.scrollIntoView = scrollIntoView
  return { element, scrollIntoView }
}

/** A window of a known size, with a reduced-motion answer. */
function windowOf(reduce = false): Window {
  return {
    innerWidth: 1000,
    innerHeight: 800,
    matchMedia: (query: string) => ({ matches: reduce && query.includes('reduce') }),
  } as unknown as Window
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isInView', () => {
  it('is true for an element comfortably on screen', () => {
    const { element } = target({ left: 100, top: 200, width: 120, height: 40 })
    expect(isInView(element, windowOf())).toBe(true)
  })

  it('is false for an element above the fold', () => {
    const { element } = target({ left: 100, top: -50, width: 120, height: 40 })
    expect(isInView(element, windowOf())).toBe(false)
  })

  it('is false for an element below the fold', () => {
    const { element } = target({ left: 100, top: 900, width: 120, height: 40 })
    expect(isInView(element, windowOf())).toBe(false)
  })

  it('is false for an element hugging the bottom edge', () => {
    const { element } = target({ left: 100, top: 790, width: 120, height: 40 })
    expect(isInView(element, windowOf())).toBe(false)
  })
})

describe('scrollIntoViewIfNeeded', () => {
  it('leaves the page alone when the target is already visible', () => {
    const { element, scrollIntoView } = target({ left: 100, top: 200, width: 120, height: 40 })
    scrollIntoViewIfNeeded(element, windowOf())
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('brings an off-screen target into the middle of the view', () => {
    const { element, scrollIntoView } = target({ left: 100, top: 2000, width: 120, height: 40 })
    scrollIntoViewIfNeeded(element, windowOf())
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: 'center', behavior: 'smooth' }),
    )
  })

  it('does not animate the scroll for someone who asked for less motion', () => {
    const { element, scrollIntoView } = target({ left: 100, top: 2000, width: 120, height: 40 })
    scrollIntoViewIfNeeded(element, windowOf(true))
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
  })

  it('copes with a browser that cannot scroll an element into view', () => {
    const { element } = target({ left: 100, top: 2000, width: 120, height: 40 })
    // @ts-expect-error deliberately removing the method to mimic an old browser
    element.scrollIntoView = undefined
    expect(() => scrollIntoViewIfNeeded(element, windowOf())).not.toThrow()
  })
})
