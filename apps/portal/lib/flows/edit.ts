import type { Step } from '@wendmark/core'

/**
 * Changing a recorded process after the fact.
 *
 * A recording is a rough draft: the wording comes from whatever the buttons
 * happened to be called, a misclick becomes a step, and the order is
 * whatever the author did rather than what reads best. These are the
 * operations that turn that into something worth showing a user.
 *
 * Pure, and never touching a target: what a step *points at* was captured in
 * the app, and cannot be rewritten sensibly from a desk in the portal. Text,
 * order and intent are editable; fingerprints are not.
 */

/** As long as a step's wording may be, matching the core schema. */
export const MAX_STEP_TEXT = 2000

/** Steps renumbered s1, s2, s3… so ids stay tidy after an edit. */
function renumber(steps: Step[]): Step[] {
  return steps.map((step, index) => ({ ...step, id: `s${index + 1}` }) as Step)
}

/** Rewrites what a step tells the user. Empty text leaves it alone. */
export function retitleStep(steps: Step[], id: string, text: string): Step[] {
  const trimmed = text.trim().slice(0, MAX_STEP_TEXT)
  if (trimmed === '') return steps

  return steps.map((step) => (step.id === id ? ({ ...step, text: trimmed } as Step) : step))
}

/** Moves a step up or down. Out of range, nothing happens. */
export function moveStep(steps: Step[], id: string, direction: -1 | 1): Step[] {
  const from = steps.findIndex((step) => step.id === id)
  if (from === -1) return steps

  const to = from + direction
  if (to < 0 || to >= steps.length) return steps

  const next = [...steps]
  const [moving] = next.splice(from, 1)
  if (!moving) return steps
  next.splice(to, 0, moving)
  return renumber(next)
}

/**
 * Removes a step.
 *
 * The last one cannot go: a process with no steps is not a process, and the
 * author almost certainly meant to delete the whole thing instead.
 */
export function removeStep(steps: Step[], id: string): Step[] {
  if (steps.length <= 1) return steps

  const remaining = steps.filter((step) => step.id !== id)
  return remaining.length === steps.length ? steps : renumber(remaining)
}

/**
 * Marks a step as pointing at the user's own data.
 *
 * "Click Kiambu AA" recorded from one account is "pick one of your coffees"
 * for everyone else. A dynamic step rings the whole group and lets the user
 * choose, which is the only honest thing guidance can do there.
 */
export function setDynamic(steps: Step[], id: string, dynamic: boolean): Step[] {
  return steps.map((step) =>
    step.id === id && step.type === 'action' ? { ...step, dynamic } : step,
  )
}

/**
 * Adds something for the user to read, after a given step.
 *
 * An instruction points at nothing: it is the place to explain why a process
 * exists, or what to have ready, which a recording can never capture.
 */
export function addNote(steps: Step[], text: string, afterId: string | null): Step[] {
  const trimmed = text.trim().slice(0, MAX_STEP_TEXT)
  if (trimmed === '') return steps

  const note: Step = { type: 'instruction', id: 'new', text: trimmed }
  const at = afterId === null ? steps.length : steps.findIndex((step) => step.id === afterId) + 1
  const position = at === 0 ? steps.length : at

  const next = [...steps]
  next.splice(position, 0, note)
  return renumber(next)
}
