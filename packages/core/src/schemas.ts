import { z } from 'zod'
import { SCHEMA_VERSION } from './version'

/**
 * Wire and storage format for recorded flows. Shared by the snippet (player,
 * recorder) and the portal. Pure data: no DOM, no network, no Node APIs.
 *
 * Objects are strict — unknown keys are rejected rather than silently dropped,
 * so a step can never smuggle in fields another part of the system ignores.
 * Breaking changes bump `schemaVersion`.
 */

export { SCHEMA_VERSION }

const Id = z.string().min(1).max(128)

/** Human-facing text shown to the end user. Authored, never user-typed data. */
const DisplayText = z.string().trim().min(1).max(2000)

/**
 * How to find the element a step points at. Initial shape only: the full
 * fingerprint is designed in @wendmark/dom. Every field is structural or an
 * authored label — never a value the user typed.
 */
export const TargetSchema = z.strictObject({
  /** CSS selectors captured at record time. One anchor among several. */
  selectors: z.array(z.string().min(1)).min(1).max(5),
  /** ARIA role (explicit or implicit). */
  role: z.string().min(1).optional(),
  /** Accessible name: aria-label, associated <label>, etc. */
  name: z.string().min(1).max(200).optional(),
  /** Visible text content of the element. Never an input's value. */
  text: z.string().min(1).max(200).optional(),
  /** Developer-provided test id (data-testid etc.). The most stable anchor when present. */
  testId: z.string().min(1).optional(),
  /** Label of the section the element sits in, e.g. "Delivery address". Tells apart same-named elements. */
  context: z.string().min(1).max(200).optional(),
  /** The page this step was recorded on. A hint for "go here", never a gate. */
  url: z.string().min(1).max(2000).optional(),
})

/** A step that points at an element the user should interact with. */
export const ActionStepSchema = z.strictObject({
  type: z.literal('action'),
  id: Id,
  text: DisplayText,
  target: TargetSchema,
  /** Target is instance data (a product, an order), not fixed UI: highlight all similar elements. */
  dynamic: z.boolean().default(false),
})

/**
 * A step where the user fills something in: a text field, a dropdown, a
 * checkbox. It points at the field, and completes when the user has changed
 * it — what they put in is never recorded or checked.
 */
export const InputStepSchema = z.strictObject({
  type: z.literal('input'),
  id: Id,
  text: DisplayText,
  target: TargetSchema,
})

/** A step that only shows text. It has no target. */
export const InstructionStepSchema = z.strictObject({
  type: z.literal('instruction'),
  id: Id,
  text: DisplayText,
})

export const StepSchema = z.discriminatedUnion('type', [
  ActionStepSchema,
  InputStepSchema,
  InstructionStepSchema,
])

export const FlowSchema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: Id,
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    steps: z.array(StepSchema).min(1),
  })
  .superRefine((flow, ctx) => {
    const seen = new Set<string>()
    flow.steps.forEach((step, index) => {
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate step id "${step.id}"`,
          path: ['steps', index, 'id'],
        })
      }
      seen.add(step.id)
    })
  })

export type Target = z.infer<typeof TargetSchema>
export type ActionStep = z.infer<typeof ActionStepSchema>
export type InputStep = z.infer<typeof InputStepSchema>
export type InstructionStep = z.infer<typeof InstructionStepSchema>
export type Step = z.infer<typeof StepSchema>
export type StepType = Step['type']
export type Flow = z.infer<typeof FlowSchema>
