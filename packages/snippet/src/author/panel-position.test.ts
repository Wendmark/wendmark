import { afterEach, describe, expect, it } from 'vitest'
import { clampPosition, defaultPosition, loadPosition, savePosition } from './panel-position'

const panel = { width: 320, height: 400 }
const viewport = { width: 1000, height: 800 }

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('defaultPosition', () => {
  it('starts in the top right, clear of the edge', () => {
    expect(defaultPosition(panel, viewport)).toEqual({ left: 664, top: 16 })
  })

  it('does not go off the left edge in a narrow window', () => {
    expect(defaultPosition(panel, { width: 300, height: 600 }).left).toBe(16)
  })
})

describe('clampPosition', () => {
  it('leaves a sensible position alone', () => {
    expect(clampPosition({ left: 200, top: 100 }, panel, viewport)).toEqual({
      left: 200,
      top: 100,
    })
  })

  it('keeps a grabbable strip on screen when dragged off the right', () => {
    const position = clampPosition({ left: 2000, top: 100 }, panel, viewport)
    expect(position.left).toBeLessThanOrEqual(viewport.width - 80)
  })

  it('keeps a grabbable strip on screen when dragged off the left', () => {
    const position = clampPosition({ left: -1000, top: 100 }, panel, viewport)
    expect(position.left + panel.width).toBeGreaterThanOrEqual(80)
  })

  it('never lets the header go above the top, where it could not be grabbed', () => {
    expect(clampPosition({ left: 100, top: -500 }, panel, viewport).top).toBe(0)
  })

  it('keeps the whole panel on screen when dragged off the bottom, so Save stays reachable', () => {
    const position = clampPosition({ left: 100, top: 5000 }, panel, viewport)
    expect(position.top + panel.height).toBeLessThanOrEqual(viewport.height - 16)
  })

  it('moves up when it has grown too tall to fit where it was put', () => {
    const tall = { width: 320, height: 700 }
    expect(clampPosition({ left: 100, top: 420 }, tall, viewport).top).toBe(84)
  })

  it('moves up when a remembered spot is too low for a smaller window', () => {
    const small = { width: 1000, height: 500 }
    const position = clampPosition({ left: 100, top: 450 }, panel, small)
    expect(position.top + panel.height).toBeLessThanOrEqual(small.height - 16)
  })

  it('sits at the top when the panel fills the window', () => {
    const full = { width: 320, height: 800 }
    expect(clampPosition({ left: 100, top: 300 }, full, viewport).top).toBe(0)
  })
})

describe('remembering where it was put', () => {
  it('saves and reads back a position', () => {
    savePosition(localStorage, { left: 120, top: 40 })
    expect(loadPosition(localStorage)).toEqual({ left: 120, top: 40 })
  })

  it('has nothing to say the first time', () => {
    expect(loadPosition(localStorage)).toBeNull()
  })

  it('ignores anything that is not a position', () => {
    localStorage.setItem('wendmark:panel-position', 'nonsense')
    expect(loadPosition(localStorage)).toBeNull()

    localStorage.setItem('wendmark:panel-position', JSON.stringify({ left: 'far', top: 0 }))
    expect(loadPosition(localStorage)).toBeNull()

    localStorage.setItem('wendmark:panel-position', JSON.stringify({ left: Infinity, top: 0 }))
    expect(loadPosition(localStorage)).toBeNull()
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

    expect(() => savePosition(broken, { left: 1, top: 1 })).not.toThrow()
    expect(loadPosition(broken)).toBeNull()
  })
})
