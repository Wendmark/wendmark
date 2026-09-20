import type { Target } from '@wendmark/core'
import { collectCandidates } from './candidates'
import { ACCEPT_THRESHOLD, scoreCandidate } from './score'
import { isProbablyVisible } from './visible'

/** The outcome of looking for a recorded target on the page as it is now. */
export type Resolution =
  | { status: 'found'; element: Element; score: number }
  | { status: 'ambiguous'; elements: Element[]; score: number }
  | { status: 'not-found' }

/** Of equally good candidates, keep the innermost ones. */
function innermost(elements: Element[]): Element[] {
  return elements.filter(
    (element) => !elements.some((other) => other !== element && element.contains(other)),
  )
}

/**
 * Finds the element a recorded target describes, on the page as it is now.
 *
 * Every clue nominates candidates, every candidate is scored against every
 * clue, and the best one wins if it is clearly best. Several equally good
 * candidates are reported as ambiguous rather than guessed between.
 */
export function resolve(target: Target, root: ParentNode): Resolution {
  let best = ACCEPT_THRESHOLD - 1
  let winners: Element[] = []

  for (const candidate of collectCandidates(target, root)) {
    if (!isProbablyVisible(candidate)) continue
    const score = scoreCandidate(target, candidate)
    if (score > best) {
      best = score
      winners = [candidate]
    } else if (score === best) {
      winners.push(candidate)
    }
  }

  if (winners.length === 0) return { status: 'not-found' }

  const deepest = innermost(winners)
  if (deepest.length === 1 && deepest[0]) {
    return { status: 'found', element: deepest[0], score: best }
  }
  return { status: 'ambiguous', elements: deepest, score: best }
}
