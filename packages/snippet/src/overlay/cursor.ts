/**
 * A hand-drawn arrow, sized like a real pointer. The tip is at (6, 3) in the
 * SVG's own coordinates, which is the point we place on the target.
 */
/** Text shown next to the cursor while it points at something. */
const DEFAULT_LABEL = 'Click here'

/** Near the right edge, the label flips to the cursor's left. */
const FLIP_MARGIN = 200

/** How high above the bottom edge the cursor starts its entrance. */
const ENTRANCE_OFFSET = 60

const CURSOR_SVG = `
<svg width="28" height="30" viewBox="0 0 28 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path
    d="M6 2.5v21l5.4-4.9 3.2 7.1 3.9-1.8-3.2-6.9 7.4-.3z"
    fill="#ffffff"
    stroke="#5a48e8"
    stroke-width="1.8"
    stroke-linejoin="round"
  />
</svg>
`

const CURSOR_CSS = `
  [data-wendmark="cursor"] {
    position: fixed;
    left: 0;
    top: 0;
    pointer-events: none;
    filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.45));
  }
  [data-wendmark="cursor"] svg { display: block; }

  [data-wendmark="cursor"].is-gliding {
    transition:
      left 0.65s cubic-bezier(0.22, 0.61, 0.36, 1),
      top 0.65s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  [data-wendmark="chip"] {
    position: absolute;
    left: 26px;
    top: 24px;
    white-space: nowrap;
    padding: 7px 13px;
    border-radius: 999px;
    border: 1px solid rgba(90, 72, 232, 0.35);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 4px 14px rgba(90, 72, 232, 0.3);
    color: #5a48e8;
    font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  [data-wendmark="cursor"].is-flipped [data-wendmark="chip"] {
    left: auto;
    right: 26px;
  }
`

/** Keep the cursor at least this far inside the window. */
const VIEWPORT_MARGIN = 8

/** Just enough of a rect for the maths, so tests need no real layout. */
export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Where the cursor's tip belongs for a target: its middle, kept on screen. */
export function cursorPoint(
  box: Box,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const clamp = (value: number, max: number): number =>
    Math.min(Math.max(value, VIEWPORT_MARGIN), Math.max(max - VIEWPORT_MARGIN, VIEWPORT_MARGIN))

  return {
    x: clamp(box.left + box.width / 2, viewport.width),
    y: clamp(box.top + box.height / 2, viewport.height),
  }
}

/** The teaching cursor: a pointer that shows where to click next. */
export interface Cursor {
  moveTo: (x: number, y: number) => void
  pointAt: (element: Element, view: Window, options?: { glide?: boolean }) => void
  setLabel: (text: string) => void
  hide: () => void
  destroy: () => void
}

/**
 * Whether the user asked their system for less animation. Respecting this is
 * an accessibility requirement: motion can cause nausea and migraines.
 */
export function prefersReducedMotion(view: Window): boolean {
  try {
    return view.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Creates the teaching cursor inside an overlay's shadow root. */
export function createCursor(root: ShadowRoot, doc: Document): Cursor {
  const style = doc.createElement('style')
  style.textContent = CURSOR_CSS
  root.appendChild(style)

  const cursor = doc.createElement('div')
  cursor.dataset.wendmark = 'cursor'
  cursor.innerHTML = CURSOR_SVG
  cursor.style.display = 'none'

  const chip = doc.createElement('span')
  chip.dataset.wendmark = 'chip'
  chip.textContent = DEFAULT_LABEL
  cursor.appendChild(chip)

  root.appendChild(cursor)

  /** Place the cursor with no animation at all. */
  function placeAt(x: number, y: number): void {
    cursor.classList.remove('is-gliding')
    cursor.style.left = `${x}px`
    cursor.style.top = `${y}px`
    // Read a layout value so the browser applies this position before the
    // next one animates from it, instead of collapsing both into one jump.
    void cursor.offsetWidth
  }

  function moveTo(x: number, y: number, viewportWidth?: number): void {
    cursor.style.left = `${x}px`
    cursor.style.top = `${y}px`
    // Keep the label on screen: flip it to the left near the right edge.
    const width = viewportWidth ?? Number.POSITIVE_INFINITY
    cursor.classList.toggle('is-flipped', x + FLIP_MARGIN > width)
    cursor.style.display = 'block'
  }

  return {
    moveTo,
    pointAt: (element: Element, view: Window, options?: { glide?: boolean }) => {
      const point = cursorPoint(element.getBoundingClientRect(), {
        width: view.innerWidth,
        height: view.innerHeight,
      })
      const glide = (options?.glide ?? true) && !prefersReducedMotion(view)

      if (glide && cursor.style.display === 'none') {
        // First appearance: come in from the bottom of the screen, so the
        // user's eye follows the cursor to the target.
        placeAt(view.innerWidth / 2, view.innerHeight - ENTRANCE_OFFSET)
      }
      cursor.classList.toggle('is-gliding', glide)
      moveTo(point.x, point.y, view.innerWidth)
    },
    setLabel: (text: string) => {
      chip.textContent = text
    },
    hide: () => {
      cursor.style.display = 'none'
    },
    destroy: () => {
      cursor.remove()
      style.remove()
    },
  }
}
