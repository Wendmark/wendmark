import type { ActionStep, Flow, InputStep, Step } from '@wendmark/core'

/**
 * The flow being recorded, as the panel sees it.
 *
 * Held in memory while recording, with small operations the panel calls:
 * rename a step, drop a misclick, move one, mark one as the user's own data.
 * Pure and dependency-free, so the fiddly rules are easy to test.
 */

export interface Draft {
  name: string
  steps: Step[]
}

/** A new, empty draft. */
export function emptyDraft(name = 'Untitled process'): Draft {
  return { name, steps: [] }
}

/** Numbers steps s1, s2, s3… so ids stay tidy after edits. */
function renumber(steps: Step[]): Step[] {
  return steps.map((step, index) => ({ ...step, id: `s${index + 1}` }) as Step)
}

/** Adds a step to the end. */
export function addStep(draft: Draft, step: Step): Draft {
  return { ...draft, steps: renumber([...draft.steps, step]) }
}

/** Swaps the last step for a better one: a click on a field, then filling it in. */
export function replaceLastStep(draft: Draft, step: Step): Draft {
  return { ...draft, steps: renumber([...draft.steps.slice(0, -1), step]) }
}

/** Removes a step: a misclick, or something the user should not be told. */
export function removeStep(draft: Draft, id: string): Draft {
  return { ...draft, steps: renumber(draft.steps.filter((step) => step.id !== id)) }
}

/** Rewrites what a step tells the user. */
export function retitleStep(draft: Draft, id: string, text: string): Draft {
  const trimmed = text.trim()
  if (trimmed === '') return draft
  return {
    ...draft,
    steps: draft.steps.map((step) =>
      step.id === id ? ({ ...step, text: trimmed } as Step) : step,
    ),
  }
}

/** Moves a step up or down. Out of range, nothing happens. */
export function moveStep(draft: Draft, id: string, direction: -1 | 1): Draft {
  const from = draft.steps.findIndex((step) => step.id === id)
  if (from === -1) return draft
  const to = from + direction
  if (to < 0 || to >= draft.steps.length) return draft

  const steps = [...draft.steps]
  const [moving] = steps.splice(from, 1)
  if (!moving) return draft
  steps.splice(to, 0, moving)
  return { ...draft, steps: renumber(steps) }
}

/**
 * Marks a step as pointing at the user's own data — a coffee, an order, a
 * row — rather than fixed interface. The player then highlights the whole
 * group and lets the user choose. Only action steps can be dynamic.
 */
export function setDynamic(draft: Draft, id: string, dynamic: boolean): Draft {
  return {
    ...draft,
    steps: draft.steps.map((step) =>
      step.id === id && step.type === 'action' ? ({ ...step, dynamic } as ActionStep) : step,
    ),
  }
}

/** Adds a step that only tells the user something. */
export function addNote(draft: Draft, text: string): Draft {
  const trimmed = text.trim()
  if (trimmed === '') return draft
  return addStep(draft, { type: 'instruction', id: 'pending', text: trimmed })
}

/** Renames the process itself. */
export function renameDraft(draft: Draft, name: string): Draft {
  const trimmed = name.trim()
  return trimmed === '' ? draft : { ...draft, name: trimmed }
}

/** Whether this draft is worth saving. */
export function canSave(draft: Draft): boolean {
  return draft.steps.length > 0 && draft.name.trim() !== ''
}

/** The draft as a flow, ready to be played or sent to the portal. */
export function toFlow(draft: Draft, id: string): Flow {
  return {
    schemaVersion: 1,
    id,
    name: draft.name,
    steps: draft.steps as [Step, ...Step[]],
  }
}

/** Whether a step is one the user fills in, for the panel's wording. */
export function isInputStep(step: Step): step is InputStep {
  return step.type === 'input'
}
