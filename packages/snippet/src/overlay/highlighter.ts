import { createOverlay } from './overlay'
import { createRing } from './ring'
import { trackElement, type Tracker } from './track'

/** What a highlighter can tell the caller about. */
export interface HighlighterOptions {
  onLost?: (element: Element) => void
}

/** Rings one element at a time and keeps the ring on it. */
export interface Highlighter {
  highlight: (element: Element) => void
  clear: () => void
  destroy: () => void
}

/** Creates the overlay, the ring inside it, and the tracking that ties them. */
export function createHighlighter(
  doc: Document,
  view: Window,
  options: HighlighterOptions,
): Highlighter {
  const overlay = createOverlay(doc)
  const ring = createRing(overlay.root, doc)
  let tracker: Tracker | null = null

  function stopTracking(): void {
    tracker?.stop()
    tracker = null
  }

  function clear(): void {
    stopTracking()
    ring.hide()
  }

  return {
    highlight: (element: Element) => {
      stopTracking()
      ring.show(element)
      tracker = trackElement(element, view, {
        onMove: () => ring.update(),
        onLost: () => {
          clear()
          options.onLost?.(element)
        },
      })
    },
    clear,
    destroy: () => {
      clear()
      ring.destroy()
      overlay.destroy()
    },
  }
}
