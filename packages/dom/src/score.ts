import type { Target } from '@wendmark/core'
import { getContext } from './context'
import { getAccessibleName } from './name'
import { getRole } from './role'
import { TEST_ID_ATTRIBUTES } from './test-id'
import { clean, textWithoutFields } from './text'

/** What each clue is worth. Evidence built to identify an element counts most. */
const POINTS = {
  testId: 6,
  nameExact: 5,
  selector: 4,
  textExact: 4,
  partial: 1,
  role: 1,
  context: 1,
}

/** A selector that matches an element saying something else has drifted. */
const TEXT_DISAGREES_PENALTY = 2

/** A candidate needs at least this many points to be accepted at all. */
export const ACCEPT_THRESHOLD = 4

type Match = 'exact' | 'partial' | 'none'

/** How a recorded value compares with what an element says now. */
function compare(recorded: string | undefined, actual: string): Match {
  const wanted = clean(recorded).toLowerCase()
  const found = clean(actual).toLowerCase()
  if (wanted === '' || found === '') return 'none'
  if (wanted === found) return 'exact'
  if (found.includes(wanted) || wanted.includes(found)) return 'partial'
  return 'none'
}

/** Whether the element carries the recorded test id under any known attribute. */
function hasTestId(element: Element, testId: string): boolean {
  return TEST_ID_ATTRIBUTES.some((attribute) => element.getAttribute(attribute) === testId)
}

/** Whether any of the recorded selectors still matches this element. */
function matchesAnySelector(element: Element, selectors: string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector)
    } catch {
      return false
    }
  })
}

/** How well an element matches a recorded target. Higher is better. */
export function scoreCandidate(target: Target, element: Element): number {
  let score = 0

  if (target.testId && hasTestId(element, target.testId)) score += POINTS.testId

  const selectorMatches = matchesAnySelector(element, target.selectors)
  if (selectorMatches) score += POINTS.selector

  const nameMatch = compare(target.name, getAccessibleName(element) ?? '')
  if (nameMatch === 'exact') score += POINTS.nameExact
  else if (nameMatch === 'partial') score += POINTS.partial

  const textMatch = compare(target.text, textWithoutFields(element))
  if (textMatch === 'exact') score += POINTS.textExact
  else if (textMatch === 'partial') score += POINTS.partial

  // A selector that matches an element saying something else is a stale path.
  const said = target.name ?? target.text
  if (selectorMatches && said && nameMatch === 'none' && textMatch === 'none') {
    score -= TEXT_DISAGREES_PENALTY
  }

  if (target.role && getRole(element) === target.role) score += POINTS.role
  if (compare(target.context, getContext(element) ?? '') !== 'none') score += POINTS.context

  return score
}
