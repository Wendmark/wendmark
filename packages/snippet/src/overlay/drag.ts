/**
 * Dragging our own widgets by a handle.
 *
 * Only ever attached to Wendmark's own controls, inside its shadow root:
 * the host page's events are never touched.
 *
 * A handle can also be a button (the launcher's pill, the recorder's bar).
 * A press that barely moves stays a click; a real drag moves the widget and
 * swallows the click that would otherwise follow it.
 */

/** How far a press must travel before it counts as a drag. */
const THRESHOLD = 4

export interface DragOptions {
  /** A drag has begun: the press moved past the threshold. */
  onStart?: () => void
  /** Moved by (dx, dy) since the press began. */
  onMove: (dx: number, dy: number) => void
  /** Let go after dragging. */
  onEnd?: () => void
  /** Presses that start on these are left alone, e.g. a text field. */
  ignore?: (target: Element) => boolean
}

/** Makes `handle` draggable. Returns a function that undoes it. */
export function makeDraggable(handle: HTMLElement, options: DragOptions): () => void {
  let suppressClick = false

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    const target = event.target instanceof Element ? event.target : null
    if (target && options.ignore?.(target)) return

    const startX = event.clientX
    const startY = event.clientY
    let dragging = false
    if (typeof handle.setPointerCapture === 'function') {
      try {
        handle.setPointerCapture(event.pointerId)
      } catch {
        // No capture means a fast drag can slip off the handle. It still works.
      }
    }

    function onPointerMove(move: PointerEvent): void {
      const dx = move.clientX - startX
      const dy = move.clientY - startY
      if (!dragging) {
        if (Math.hypot(dx, dy) < THRESHOLD) return
        dragging = true
        options.onStart?.()
      }
      options.onMove(dx, dy)
    }

    function onPointerUp(): void {
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', onPointerUp)
      handle.removeEventListener('pointercancel', onPointerUp)
      if (!dragging) return
      options.onEnd?.()
      // The click that follows a drag was not meant as one. Reset on the
      // next turn in case the browser decides not to send it at all.
      suppressClick = true
      setTimeout(() => {
        suppressClick = false
      }, 0)
    }

    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', onPointerUp)
    handle.addEventListener('pointercancel', onPointerUp)
  }

  function onClick(event: MouseEvent): void {
    if (!suppressClick) return
    suppressClick = false
    // Our own handle, so stopping the event here touches nothing of the page's.
    event.stopImmediatePropagation()
    event.preventDefault()
  }

  handle.addEventListener('pointerdown', onPointerDown)
  handle.addEventListener('click', onClick, true)

  return () => {
    handle.removeEventListener('pointerdown', onPointerDown)
    handle.removeEventListener('click', onClick, true)
  }
}
