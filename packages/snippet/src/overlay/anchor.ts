/**
 * Where a corner widget sits: the launcher and the recorder.
 *
 * Both grow out of a pill in their bottom-right corner, so their position is
 * kept as offsets from the window's bottom-right rather than a top-left
 * point. The pill and the panel it grows into share it, and folding always
 * shrinks back to the same spot.
 *
 * Both can be dragged out of the way of whatever they cover, and remember
 * where they were put, in this browser, on this site.
 */

/** Pixels from the right and bottom edges of the window. */
export interface Anchor {
  right: number
  bottom: number
}

export interface Size {
  width: number
  height: number
}

export const DEFAULT_ANCHOR: Anchor = { right: 16, bottom: 16 }

/** The closest a widget comes to the edge of the window. */
const EDGE = 8

/** Keeps a widget of this size wholly on screen. */
export function clampAnchor(anchor: Anchor, box: Size, viewport: Size): Anchor {
  const maxRight = Math.max(viewport.width - box.width - EDGE, EDGE)
  const maxBottom = Math.max(viewport.height - box.height - EDGE, EDGE)
  return {
    right: Math.min(Math.max(anchor.right, EDGE), maxRight),
    bottom: Math.min(Math.max(anchor.bottom, EDGE), maxBottom),
  }
}

/** The anchor after a drag of (dx, dy) from where it started. */
export function dragAnchor(start: Anchor, dx: number, dy: number): Anchor {
  return { right: start.right - dx, bottom: start.bottom - dy }
}

/** Remembers an anchor for next time, if the browser allows it. */
export function saveAnchor(storage: Storage | undefined, key: string, anchor: Anchor): void {
  try {
    storage?.setItem(key, JSON.stringify(anchor))
  } catch {
    // Blocked storage only means it forgets. Not worth a fuss.
  }
}

/** Reads back a remembered anchor, or null when there is nothing sensible. */
export function loadAnchor(storage: Storage | undefined, key: string): Anchor | null {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<Anchor>
    if (typeof candidate.right !== 'number' || typeof candidate.bottom !== 'number') return null
    if (!Number.isFinite(candidate.right) || !Number.isFinite(candidate.bottom)) return null
    return { right: candidate.right, bottom: candidate.bottom }
  } catch {
    return null
  }
}

/**
 * One remembered anchor that several elements follow: the launcher's pill
 * and the panel it opens into, or the recorder and its folded pill.
 */
export interface Position {
  get: () => Anchor
  set: (anchor: Anchor) => void
  /** Remember the current anchor for next time. */
  save: () => void
}

export function rememberedPosition(storage: Storage | undefined, key: string): Position {
  let anchor = loadAnchor(storage, key) ?? DEFAULT_ANCHOR
  return {
    get: () => anchor,
    set: (next) => {
      anchor = next
    },
    save: () => saveAnchor(storage, key, anchor),
  }
}

/** Puts an element at an anchor. */
export function placeAt(element: HTMLElement, anchor: Anchor): void {
  element.style.right = `${anchor.right}px`
  element.style.bottom = `${anchor.bottom}px`
}

/** The window's size, with a sensible stand-in where there is no window. */
export function viewportOf(doc: Document): Size {
  const view = doc.defaultView
  return { width: view?.innerWidth ?? 1024, height: view?.innerHeight ?? 768 }
}

/** An element's size, with a stand-in where nothing is laid out (tests). */
export function sizeOf(element: HTMLElement, fallback: Size): Size {
  const rect = element.getBoundingClientRect()
  return {
    width: rect.width || fallback.width,
    height: rect.height || fallback.height,
  }
}
