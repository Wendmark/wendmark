/** How far up to look for a hidden ancestor. */
const MAX_ANCESTORS = 50

/**
 * Whether an element is shown to the user, as far as we can tell without a
 * layout engine: not detached, not hidden by an attribute or by CSS.
 *
 * Size and position are checked by the player, which runs in a real browser.
 */
export function isProbablyVisible(element: Element): boolean {
  if (!element.isConnected) return false
  if (element.closest('[hidden], [aria-hidden="true"]')) return false

  const view = element.ownerDocument.defaultView
  if (!view) return true

  let current: Element | null = element
  for (let level = 0; current && level < MAX_ANCESTORS; level++) {
    const style = view.getComputedStyle(current)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    current = current.parentElement
  }
  return true
}
