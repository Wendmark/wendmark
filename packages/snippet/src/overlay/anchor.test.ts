import { afterEach, describe, expect, it } from 'vitest'
import { clampAnchor, dragAnchor, loadAnchor, saveAnchor } from './anchor'

const viewport = { width: 1000, height: 800 }
const panel = { width: 340, height: 400 }
const KEY = 'wendmark:test-position'

afterEach(() => {
  localStorage.clear()
})

describe('clampAnchor', () => {
  it('leaves a sensible position alone', () => {
    expect(clampAnchor({ right: 100, bottom: 120 }, panel, viewport)).toEqual({
      right: 100,
      bottom: 120,
    })
  })

  it('keeps the whole widget on screen when dragged past the left or top', () => {
    const anchor = clampAnchor({ right: 5000, bottom: 5000 }, panel, viewport)
    expect(viewport.width - anchor.right - panel.width).toBeGreaterThanOrEqual(8)
    expect(viewport.height - anchor.bottom - panel.height).toBeGreaterThanOrEqual(8)
  })

  it('keeps it off the right and bottom edges', () => {
    expect(clampAnchor({ right: -50, bottom: -50 }, panel, viewport)).toEqual({
      right: 8,
      bottom: 8,
    })
  })

  it('pins it to the corner when it is bigger than the window', () => {
    const huge = { width: 2000, height: 2000 }
    expect(clampAnchor({ right: 300, bottom: 300 }, huge, viewport)).toEqual({
      right: 8,
      bottom: 8,
    })
  })
})

describe('dragAnchor', () => {
  it('moves away from the corner when dragged up and left', () => {
    expect(dragAnchor({ right: 16, bottom: 16 }, -100, -40)).toEqual({ right: 116, bottom: 56 })
  })
})

describe('remembering where it was put', () => {
  it('saves and reads back an anchor', () => {
    saveAnchor(localStorage, KEY, { right: 40, bottom: 90 })
    expect(loadAnchor(localStorage, KEY)).toEqual({ right: 40, bottom: 90 })
  })

  it('has nothing to say the first time', () => {
    expect(loadAnchor(localStorage, KEY)).toBeNull()
  })

  it('ignores anything that is not an anchor', () => {
    localStorage.setItem(KEY, 'nonsense')
    expect(loadAnchor(localStorage, KEY)).toBeNull()

    localStorage.setItem(KEY, JSON.stringify({ left: 10, top: 10 }))
    expect(loadAnchor(localStorage, KEY)).toBeNull()

    localStorage.setItem(KEY, JSON.stringify({ right: Infinity, bottom: 0 }))
    expect(loadAnchor(localStorage, KEY)).toBeNull()
  })

  it('copes with a browser that refuses storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    } as unknown as Storage

    expect(() => saveAnchor(broken, KEY, { right: 1, bottom: 1 })).not.toThrow()
    expect(loadAnchor(broken, KEY)).toBeNull()
  })
})
