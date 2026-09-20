import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POLL_MS, trackElement } from './track'
import { renderPick, setRect } from '../test-utils'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

/** A tracked element, plus spies for the two things a tracker reports. */
function track() {
  const element = renderPick('<button data-pick>Save changes</button>')
  setRect(element, { left: 10, top: 20, width: 100, height: 30 })
  const onMove = vi.fn()
  const onLost = vi.fn()
  const tracker = trackElement(element, window, { onMove, onLost })
  onMove.mockClear()
  return { element, tracker, onMove, onLost }
}

describe('trackElement', () => {
  it('reports a move when the page scrolls', () => {
    const { element, tracker, onMove } = track()
    setRect(element, { left: 10, top: -40, width: 100, height: 30 })
    window.dispatchEvent(new Event('scroll'))
    expect(onMove).toHaveBeenCalled()
    tracker.stop()
  })

  it('reports a move when the window is resized', () => {
    const { element, tracker, onMove } = track()
    setRect(element, { left: 400, top: 20, width: 100, height: 30 })
    window.dispatchEvent(new Event('resize'))
    expect(onMove).toHaveBeenCalled()
    tracker.stop()
  })

  it('notices a silent layout shift while polling', () => {
    const { element, tracker, onMove } = track()
    setRect(element, { left: 10, top: 300, width: 100, height: 30 })
    vi.advanceTimersByTime(POLL_MS)
    expect(onMove).toHaveBeenCalled()
    tracker.stop()
  })

  it('stays quiet while nothing moves', () => {
    const { tracker, onMove } = track()
    vi.advanceTimersByTime(POLL_MS * 4)
    expect(onMove).not.toHaveBeenCalled()
    tracker.stop()
  })

  it('reports the target as lost once it leaves the page', () => {
    const { element, tracker, onLost } = track()
    element.remove()
    vi.advanceTimersByTime(POLL_MS * 3)
    expect(onLost).toHaveBeenCalledTimes(1)
    tracker.stop()
  })

  it('tolerates a single frame where the target is missing', () => {
    const { tracker, onLost } = track()
    vi.advanceTimersByTime(POLL_MS)
    expect(onLost).not.toHaveBeenCalled()
    tracker.stop()
  })

  it('goes silent after stop', () => {
    const { element, tracker, onMove, onLost } = track()
    tracker.stop()
    setRect(element, { left: 999, top: 999, width: 10, height: 10 })
    window.dispatchEvent(new Event('scroll'))
    element.remove()
    vi.advanceTimersByTime(POLL_MS * 5)
    expect(onMove).not.toHaveBeenCalled()
    expect(onLost).not.toHaveBeenCalled()
  })

  it('can be stopped twice', () => {
    const { tracker } = track()
    tracker.stop()
    expect(() => tracker.stop()).not.toThrow()
  })
})
