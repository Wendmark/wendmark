import type { Target } from '@wendmark/core'
import { getAccessibleName } from './name'
import { TEST_ID_ATTRIBUTES } from './test-id'
import { followShadowPath, queryAllDeep } from './shadow'
import { clean, textWithoutFields } from './text'

/** Scoring more than this many candidates is never worth it. */
const MAX_CANDIDATES = 200

/** Elements that can plausibly be a step's target, for text and name matching. */
const PLAUSIBLE_TARGETS =
  'a, button, input, select, textarea, summary, label, li, tr, td, th, ' +
  'h1, h2, h3, h4, h5, h6, [role], [tabindex], [onclick]'

/** Whether an element's text or name matches what was recorded. */
function textLooksRight(element: Element, wanted: string[]): boolean {
  if (wanted.length === 0) return false
  const own = clean(textWithoutFields(element)).toLowerCase()
  const name = clean(getAccessibleName(element)).toLowerCase()
  const longest = Math.max(...wanted.map((value) => value.length))

  // A huge container must not match merely by containing the text somewhere.
  const text = own.length > longest * 3 + 120 ? '' : own

  return wanted.some(
    (value) => text === value || name === value || text.includes(value) || name.includes(value),
  )
}

/** Run a selector without letting a malformed one break resolution. */
function safeQueryAll(root: ParentNode, selector: string): Element[] {
  // Deep: web components hide their insides from ordinary queries.
  return queryAllDeep(root, selector)
}

/**
 * Every element on the page that any of a target's clues points at. The
 * scorer then judges these few candidates against all the clues at once.
 */
export function collectCandidates(target: Target, root: ParentNode): Element[] {
  const found = new Set<Element>()

  // The exact route into a web component, when one was recorded.
  if (target.shadowPath) {
    const viaPath = followShadowPath(target.shadowPath, root)
    if (viaPath) found.add(viaPath)
  }

  for (const selector of target.selectors) {
    for (const element of safeQueryAll(root, selector)) found.add(element)
  }

  if (target.testId) {
    const value = CSS.escape(target.testId)
    for (const attribute of TEST_ID_ATTRIBUTES) {
      for (const element of safeQueryAll(root, `[${attribute}="${value}"]`)) found.add(element)
    }
  }

  const wanted = [target.name, target.text]
    .map((value) => clean(value).toLowerCase())
    .filter((value) => value !== '')

  if (wanted.length > 0) {
    for (const element of safeQueryAll(root, PLAUSIBLE_TARGETS)) {
      if (found.size >= MAX_CANDIDATES) break
      if (textLooksRight(element, wanted)) found.add(element)
    }
  }

  return [...found].slice(0, MAX_CANDIDATES)
}
