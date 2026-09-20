import { createCursor } from './cursor'
import { createOverlay } from './overlay'
import { createRing } from './ring'
import { trackElement, type Tracker } from './track'

/** What a highlighter can tell the caller about. */
export interface HighlighterOptions {
  onLost?: (element: Element) => void
}

/** What to say next to the cursor for this target. */
export interface HighlightOptions {
  label?: string
}

/** Rings one element at a time, points at it, and keeps both on it. */
export interface Highlighter {
  highlight: (element: Element, options?: HighlightOptions) => void
  clear: () => void
  destroy: () => void
}

/** Creates the overlay, the ring and cursor inside it, and the tracking. */
export function createHighlighter(
  doc: Document,
  view: Window,
  options: HighlighterOptions,
): Highlighter {
  const overlay = createOverlay(doc)
  const ring = createRing(overlay.root, doc)
  const cursor = createCursor(overlay.root, doc)
  let tracker: Tracker | null = null

  function stopTracking(): void {
    tracker?.stop()
    tracker = null
  }

  function clear(): void {
    stopTracking()
    ring.hide()
    cursor.hide()
  }

  return {
    highlight: (element: Element, highlightOptions?: HighlightOptions) => {
      stopTracking()
      if (highlightOptions?.label) cursor.setLabel(highlightOptions.label)

      ring.show(element)
      cursor.pointAt(element, view)

      tracker = trackElement(element, view, {
        // Following a moving page: reposition both, without animating.
        onMove: () => {
          ring.update()
          cursor.pointAt(element, view, { glide: false })
        },
        onLost: () => {
          clear()
          options.onLost?.(element)
        },
      })
    },
    clear,
    destroy: () => {
      clear()
      cursor.destroy()
      ring.destroy()
      overlay.destroy()
    },
  }
}
