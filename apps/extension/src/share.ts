/**
 * What leaves the browser when a guide is shared.
 *
 * The person sharing sees this exact output before anything is sent, and
 * decides three things about it:
 *
 * - **Which steps.** Any step can be left out.
 * - **Whether the page's words go too.** "Structure only", the default,
 *   takes every label off — the same masking problem reports use, so "Press
 *   Refund order FK-10421" becomes "Press a button" and ids come out of
 *   addresses. Internal tools show customers' names and order numbers, and
 *   a link travels.
 * - **A note on any step.** Wendmark never records what anyone types, so
 *   "type −1 in Quantity", when that is the point, has to be written by the
 *   person sharing.
 *
 * Steps are rebuilt field by field from what the flow format allows and
 * then checked with the strict schema, so nothing stored alongside a step —
 * least of all a typed value — can come along by accident.
 */
import { FlowSchema, type Flow, type Step, type Target } from '@wendmark/core'
import { redactStep, type LabelPolicy } from '@wendmark/core/redact'

export interface ShareSettings {
  /** "none": structure only. "all": keep the words on the page. */
  labels: LabelPolicy
  /** Ids of steps left out. */
  removed: string[]
  /** A note per step id, in the sharer's own words. */
  notes: Record<string, string>
}

export const DEFAULT_SHARE: ShareSettings = { labels: 'none', removed: [], notes: {} }

/** Long enough for a sentence, short enough to stay a note. */
export const MAX_NOTE = 280

/** Settings as stored, read defensively. */
export function readShare(value: unknown): ShareSettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SHARE
  const raw = value as Partial<Record<keyof ShareSettings, unknown>>
  const notes: Record<string, string> = {}
  if (typeof raw.notes === 'object' && raw.notes !== null) {
    for (const [id, note] of Object.entries(raw.notes)) {
      if (typeof note === 'string' && note.trim()) notes[id] = note.trim().slice(0, MAX_NOTE)
    }
  }
  return {
    labels: raw.labels === 'all' ? 'all' : 'none',
    removed: Array.isArray(raw.removed)
      ? raw.removed.filter((id): id is string => typeof id === 'string')
      : [],
    notes,
  }
}

/** A target with exactly the fields the format has, and nothing else. */
function cleanTarget(target: Target): Target {
  const clean: Target = { selectors: [...target.selectors] }
  if (target.role !== undefined) clean.role = target.role
  if (target.name !== undefined) clean.name = target.name
  if (target.text !== undefined) clean.text = target.text
  if (target.testId !== undefined) clean.testId = target.testId
  if (target.context !== undefined) clean.context = target.context
  if (target.url !== undefined) clean.url = target.url
  if (target.shadowPath !== undefined) clean.shadowPath = [...target.shadowPath]
  return clean
}

/** A step with exactly the fields the format has, and nothing else. */
function cleanStep(step: Step): Step {
  switch (step.type) {
    case 'action':
      return {
        type: 'action',
        id: step.id,
        text: step.text,
        dynamic: step.dynamic,
        target: cleanTarget(step.target),
      }
    case 'input':
      return { type: 'input', id: step.id, text: step.text, target: cleanTarget(step.target) }
    case 'instruction':
      return { type: 'instruction', id: step.id, text: step.text }
  }
}

function withNote(step: Step, note: string | undefined): Step {
  return note ? { ...step, text: `${step.text} — ${note}` } : step
}

/**
 * The guide as it would be shared, or null when nothing would be left of
 * it (every step taken out).
 */
export function shareable(flow: Flow, settings: ShareSettings = DEFAULT_SHARE): Flow | null {
  const removed = new Set(settings.removed)
  const steps = flow.steps
    .filter((step) => !removed.has(step.id))
    .map((step) => withNote(redactStep(cleanStep(step), settings.labels), settings.notes[step.id]))
  if (steps.length === 0) return null

  const parsed = FlowSchema.safeParse({
    schemaVersion: flow.schemaVersion,
    id: flow.id,
    name: flow.name,
    steps,
  })
  return parsed.success ? parsed.data : null
}
