/** How often to check a target that moved without telling anyone. */
export const POLL_MS = 250

/** Misses in a row before a target counts as gone, so a re-render is tolerated. */
const MISSES_BEFORE_LOST = 2

/** What a tracker reports back. */
export interface TrackOptions {
  onMove: () => void
  onLost: () => void
}

/** A running tracker. */
export interface Tracker {
  stop: () => void
}

/** A comparable summary of where an element is right now. */
function positionKey(element: Element): string {
  const rect = element.getBoundingClientRect()
  return `${rect.left},${rect.top},${rect.width},${rect.height}`
}

/** Watches an element's position and reports when it moves or disappears. */
export function trackElement(element: Element, view: Window, options: TrackOptions): Tracker {
  let lastPosition = positionKey(element)
  let misses = 0
  let running = true

  function stop(): void {
    if (!running) return
    running = false
    view.clearInterval(timer)
    view.removeEventListener('scroll', check, true)
    view.removeEventListener('resize', check)
  }

  function check(): void {
    if (!running) return

    if (!element.isConnected) {
      misses += 1
      if (misses >= MISSES_BEFORE_LOST) {
        stop()
        options.onLost()
      }
      return
    }
    misses = 0

    const position = positionKey(element)
    if (position !== lastPosition) {
      lastPosition = position
      options.onMove()
    }
  }

  // Scroll events do not bubble, so listen in the capture phase to catch
  // scrolling inside any container. Passive: we only observe.
  view.addEventListener('scroll', check, { capture: true, passive: true })
  view.addEventListener('resize', check, { passive: true })
  const timer = view.setInterval(check, POLL_MS)

  return { stop }
}
