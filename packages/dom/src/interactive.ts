import { getRole } from './role'

/** Roles of elements a user clicks or types into. */
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'treeitem',
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'slider',
  'spinbutton',
])

/** How many levels above the clicked element we look before giving up. */
const MAX_CLIMB = 8

/** Containers a control sits inside, never above. The climb never goes past them. */
const BOUNDARY_TAGS = new Set([
  'form',
  'section',
  'article',
  'aside',
  'main',
  'nav',
  'header',
  'footer',
  'dialog',
  'body',
])

/** The computed cursor for an element, or '' where we cannot ask. */
function cursorOf(element: Element): string {
  const view = element.ownerDocument.defaultView
  if (!view) return ''
  try {
    return view.getComputedStyle(element).cursor
  } catch {
    return ''
  }
}

/**
 * Whether this element is where a pointer cursor starts.
 *
 * Apps built with click handlers on plain elements give themselves away with
 * `cursor: pointer`. The cursor is inherited, though, so the whole subtree of
 * a clickable card looks clickable. The element whose parent does *not* have
 * a pointer cursor is the control; everything below it is its content.
 */
function isPointerCursorRoot(element: Element): boolean {
  if (cursorOf(element) !== 'pointer') return false
  const parent = element.parentElement
  return !parent || cursorOf(parent) !== 'pointer'
}

/** Whether an element is something a user interacts with directly. */
export function isInteractive(element: Element): boolean {
  const role = getRole(element)
  if (role && INTERACTIVE_ROLES.has(role)) return true

  const tabindex = element.getAttribute('tabindex')
  if (tabindex !== null && tabindex !== '-1') return true

  return isPointerCursorRoot(element)
}

/**
 * Finds the element the user meant to click: the nearest interactive element
 * at or above the one the browser reported.
 */
export function findInteractiveTarget(start: Element): Element {
  let current: Element | null = start
  for (let level = 0; current && level <= MAX_CLIMB; level++) {
    if (isInteractive(current)) return current
    if (BOUNDARY_TAGS.has(current.localName)) break
    current = current.parentElement
  }
  return start
}
