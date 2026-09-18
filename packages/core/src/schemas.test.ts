import { describe, expect, it } from 'vitest'
import { FlowSchema, SCHEMA_VERSION, StepSchema, type Flow } from './index'

const actionStep = {
  type: 'action',
  id: 's1',
  text: 'Click Subscribe',
  target: { selectors: ['[data-testid="subscribe"]'], role: 'button', name: 'Subscribe' },
} as const

const instructionStep = {
  type: 'instruction',
  id: 's2',
  text: 'Your first bag ships on Monday.',
} as const

const validFlow = {
  schemaVersion: SCHEMA_VERSION,
  id: 'flow-1',
  name: 'Start a subscription',
  steps: [actionStep, instructionStep],
}

describe('StepSchema', () => {
  it('parses an action step with a target', () => {
    const step = StepSchema.parse(actionStep)
    expect(step.type).toBe('action')
    if (step.type === 'action') expect(step.target.selectors[0]).toBe('[data-testid="subscribe"]')
  })

  it('parses an instruction step without a target', () => {
    expect(StepSchema.parse(instructionStep)).toEqual(instructionStep)
  })

  it('rejects an action step without a target', () => {
    const { target: _target, ...noTarget } = actionStep
    expect(StepSchema.safeParse(noTarget).success).toBe(false)
  })

  it('rejects an instruction step that carries a target', () => {
    const result = StepSchema.safeParse({ ...instructionStep, target: actionStep.target })
    expect(result.success).toBe(false)
  })

  it('rejects an action target with an empty selector', () => {
    const result = StepSchema.safeParse({ ...actionStep, target: { selectors: [''] } })
    expect(result.success).toBe(false)
  })

  it('rejects unknown keys on a target', () => {
    const result = StepSchema.safeParse({
      ...actionStep,
      target: { ...actionStep.target, value: 'typed by the user' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown step type', () => {
    expect(StepSchema.safeParse({ ...instructionStep, type: 'click' }).success).toBe(false)
  })

  it('rejects blank text', () => {
    expect(StepSchema.safeParse({ ...instructionStep, text: '   ' }).success).toBe(false)
  })

  it('rejects target text longer than 200 characters', () => {
    const longText = 'a'.repeat(201)
    const result = StepSchema.safeParse({
      ...actionStep,
      target: { ...actionStep.target, text: longText },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a target with no selectors', () => {
    const result = StepSchema.safeParse({
      ...actionStep,
      target: { ...actionStep.target, selectors: [] },
    })
    expect(result.success).toBe(false)
  })

  it('keeps testId on a target', () => {
    const step = StepSchema.parse({
      ...actionStep,
      target: { ...actionStep.target, testId: 'subscribe-button' },
    })
    expect(step).toMatchObject({ target: { testId: 'subscribe-button' } })
  })

  it('accepts a target with context', () => {
    const step = StepSchema.parse({
      ...actionStep,
      target: { ...actionStep.target, context: 'Delivery address' },
    })
    expect(step).toMatchObject({ target: { context: 'Delivery address' } })
  })

  it('defaults dynamic to false on action steps', () => {
    const step = StepSchema.parse(actionStep)
    expect(step).toMatchObject({ dynamic: false })
  })

  it('keeps dynamic: true on action steps', () => {
    const step = StepSchema.parse({ ...actionStep, dynamic: true })
    expect(step).toMatchObject({ dynamic: true })
  })

  it('rejects dynamic on instruction steps', () => {
    const result = StepSchema.safeParse({ ...instructionStep, dynamic: true })
    expect(result.success).toBe(false)
  })
})

describe('FlowSchema', () => {
  it('parses a valid flow and infers the Flow type', () => {
    const flow: Flow = FlowSchema.parse(validFlow)
    expect(flow.steps).toHaveLength(2)
    expect(flow.steps.map((s) => s.type)).toEqual(['action', 'instruction'])
  })

  it('accepts an optional description', () => {
    const flow = FlowSchema.parse({ ...validFlow, description: 'For new customers' })
    expect(flow.description).toBe('For new customers')
  })

  it('rejects a flow with no steps', () => {
    expect(FlowSchema.safeParse({ ...validFlow, steps: [] }).success).toBe(false)
  })

  it('rejects an unsupported schema version', () => {
    expect(FlowSchema.safeParse({ ...validFlow, schemaVersion: 2 }).success).toBe(false)
  })

  it('rejects duplicate step ids and points at the duplicate', () => {
    const result = FlowSchema.safeParse({
      ...validFlow,
      steps: [actionStep, { ...instructionStep, id: 's1' }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['steps', 1, 'id'])
  })

  it('rejects a missing name', () => {
    const { name: _name, ...noName } = validFlow
    expect(FlowSchema.safeParse(noName).success).toBe(false)
  })
})
