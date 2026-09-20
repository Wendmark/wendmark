import { clean, truncate } from './text'

/** Containers that stand for a named part of a page. */
const CONTEXT_TAGS = new Set([
  'section',
  'article',
  'form',
  'fieldset',
  'nav',
  'aside',
  'main',
  'dialog',
  'header',
  'footer',
])

/** The same idea, declared with a role instead of a tag. */
const CONTEXT_ROLES = new Set([
  'region',
  'form',
  'navigation',
  'dialog',
  'search',
  'group',
  'main',
  'complementary',
])

/** What counts as the title of such a container. */
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, legend, [role="heading"]'

/** How far up to look, and the schema's limit on the stored value. */
const MAX_CLIMB = 8
const MAX_LENGTH = 200

/** Whether an element stands for a named part of the page. */
function isContextContainer(element: Element): boolean {
  if (CONTEXT_TAGS.has(element.localName)) return true
  const role = clean(element.getAttribute('role')).toLowerCase()
  return role !== '' && CONTEXT_ROLES.has(role)
}

/**
 * Where on the page an element sits: the label or heading of the nearest
 * section around it, e.g. "Delivery address". Used to tell apart elements
 * that look the same in different parts of a page.
 */
export function getContext(element: Element): string | null {
  let current = element.parentElement

  for (let level = 0; current && level < MAX_CLIMB; level++) {
    const label = clean(current.getAttribute('aria-label'))
    if (label) return truncate(label, MAX_LENGTH)

    if (isContextContainer(current)) {
      const heading = clean(current.querySelector(HEADING_SELECTOR)?.textContent)
      if (heading) return truncate(heading, MAX_LENGTH)
    }

    current = current.parentElement
  }
  return null
}
