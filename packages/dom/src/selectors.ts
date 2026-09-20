import { isStableId, stableClasses } from './stable'
import { getTestId } from './test-id'

/** How many selectors are worth keeping. The schema allows at most five. */
const MAX_SELECTORS = 3

/** How far up the tree a structural selector may reach. */
const MAX_DEPTH = 6

/** How many classes to put in one selector segment. */
const MAX_SEGMENT_CLASSES = 2

/** Whether a selector matches the element and nothing else. */
export function matchesOnly(selector: string, element: Element): boolean {
  try {
    const found = element.ownerDocument.querySelectorAll(selector)
    return found.length === 1 && found[0] === element
  } catch {
    return false
  }
}

/** Which of its same-tag siblings this element is, counting from 1. */
function positionAmongSiblings(element: Element): number {
  const parent = element.parentElement
  if (!parent) return 1
  const sameTag = Array.from(parent.children).filter((c) => c.localName === element.localName)
  return sameTag.indexOf(element) + 1
}

/** A selector for one element on its own, ignoring its ancestors. */
function segment(element: Element): string {
  const classes = stableClasses(element)
    .slice(0, MAX_SEGMENT_CLASSES)
    .map((name) => `.${CSS.escape(name)}`)
    .join('')
  let selector = element.localName + classes
  const position = positionAmongSiblings(element)
  if (position > 1) selector += `:nth-of-type(${position})`
  return selector
}

/** A selector built from the element's place in the page. */
function structuralSelector(element: Element): string {
  let selector = segment(element)
  let current: Element = element

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (matchesOnly(selector, element)) return selector

    const parent = current.parentElement
    if (!parent || parent === element.ownerDocument.body) break
    if (isStableId(parent.id)) return `#${CSS.escape(parent.id)} ${selector}`

    selector = `${segment(parent)} > ${selector}`
    current = parent
  }
  return selector
}

/**
 * CSS selectors that find an element again, best first. Each one is checked
 * to match the element and nothing else.
 */
export function buildSelectors(element: Element): string[] {
  const candidates: string[] = []

  const testId = getTestId(element)
  if (testId) candidates.push(`[${testId.attribute}="${CSS.escape(testId.value)}"]`)
  if (isStableId(element.id)) candidates.push(`#${CSS.escape(element.id)}`)
  candidates.push(structuralSelector(element))

  const unique = candidates.filter((selector) => matchesOnly(selector, element))
  const chosen = unique.length > 0 ? unique : candidates
  return [...new Set(chosen)].slice(0, MAX_SELECTORS)
}
