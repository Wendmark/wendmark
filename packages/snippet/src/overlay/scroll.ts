import { prefersReducedMotion } from './cursor'

/** Keep this much of the viewport clear around a target before scrolling. */
const EDGE_MARGIN = 24

/** Whether an element is fully inside the viewport, with room to spare. */
export function isInView(element: Element, view: Window): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= EDGE_MARGIN &&
    rect.left >= 0 &&
    rect.bottom <= view.innerHeight - EDGE_MARGIN &&
    rect.right <= view.innerWidth
  )
}

/**
 * Bring a target on screen, but only when it is not already there.
 *
 * Guidance points at things; it should not yank the page around. So this
 * runs once per step, never while following a page the user is scrolling.
 */
export function scrollIntoViewIfNeeded(element: Element, view: Window): void {
  if (typeof element.scrollIntoView !== 'function') return
  if (isInView(element, view)) return

  element.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: prefersReducedMotion(view) ? 'auto' : 'smooth',
  })
}
