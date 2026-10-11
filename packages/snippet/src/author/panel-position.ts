/**
 * Where the recorder panel sits.
 *
 * The panel covers part of the app it is recording, which is a problem when
 * the thing you need to click is underneath it. So it can be dragged, and it
 * remembers where you put it.
 */

/** Keep at least this much of the panel on screen, so it can always be grabbed. */
const MIN_VISIBLE = 80

/** Space kept between the panel and the bottom of the window. */
const EDGE = 16

/** Where the panel sits, in viewport pixels from the top left. */
export interface Position {
  left: number
  top: number
}

export interface Box {
  width: number
  height: number
}

/**
 * Keeps a position on screen, however the window is resized or dragged.
 *
 * Sideways it may be pushed mostly out of the way, as long as a strip stays
 * grabbable. Up and down it stays whole: the steps scroll inside it and Save
 * sits at the bottom, so a panel hanging off the bottom of the window is one
 * whose end can't be reached.
 */
export function clampPosition(position: Position, panel: Box, viewport: Box): Position {
  const maxLeft = Math.max(viewport.width - MIN_VISIBLE, 0)
  const maxTop = Math.max(viewport.height - panel.height - EDGE, 0)
  return {
    left: Math.min(Math.max(position.left, MIN_VISIBLE - panel.width), maxLeft),
    top: Math.min(Math.max(position.top, 0), maxTop),
  }
}

/** Where the panel starts, before anyone drags it: the top right corner. */
export function defaultPosition(panel: Box, viewport: Box): Position {
  return { left: Math.max(viewport.width - panel.width - 16, 16), top: 16 }
}

const STORAGE_KEY = 'wendmark:panel-position'

/** Remembers a position for next time, if the browser allows it. */
export function savePosition(storage: Storage | undefined, position: Position): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(position))
  } catch {
    // Blocked storage only means the panel forgets. Not worth a fuss.
  }
}

/** Reads back a remembered position, or null when there is nothing sensible. */
export function loadPosition(storage: Storage | undefined): Position | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Partial<Position>
    if (typeof candidate.left !== 'number' || typeof candidate.top !== 'number') return null
    if (!Number.isFinite(candidate.left) || !Number.isFinite(candidate.top)) return null
    return { left: candidate.left, top: candidate.top }
  } catch {
    return null
  }
}
