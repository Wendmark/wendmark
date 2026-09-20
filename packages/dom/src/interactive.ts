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

/** Whether an element is something a user interacts with directly. */
export function isInteractive(element: Element): boolean {
  const role = getRole(element)
  if (role && INTERACTIVE_ROLES.has(role)) return true
  const tabindex = element.getAttribute('tabindex')
  return tabindex !== null && tabindex !== '-1'
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
