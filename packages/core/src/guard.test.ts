import { describe, expect, it } from 'vitest'
import { checkFlow, looksLikeFlow } from './guard'
import { SCHEMA_VERSION } from './version'

const step = {
  id: 's1',
  type: 'action',
  text: 'Open the cart',
  target: { selectors: ['#cart'] },
}

function flow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'f1',
    name: 'Order coffee',
    steps: [step],
    ...overrides,
  }
}

describe('checkFlow', () => {
  it('accepts a flow this build can play', () => {
    expect(checkFlow(flow())).toBe('ok')
  })

  it('accepts a flow carrying a field it does not know', () => {
    // Additive changes do not bump the version, so an older snippet meets
    // fields it has never heard of and must play the flow anyway.
    expect(checkFlow(flow({ category: 'onboarding' }))).toBe('ok')
    expect(checkFlow(flow({ steps: [{ ...step, hint: 'top right' }] }))).toBe('ok')
  })

  it('calls a newer format too new, not malformed', () => {
    expect(checkFlow(flow({ schemaVersion: SCHEMA_VERSION + 1 }))).toBe('too-new')
  })

  it('calls an unknown step type too new', () => {
    expect(checkFlow(flow({ steps: [{ id: 's1', type: 'wait', text: 'Wait for it' }] }))).toBe(
      'too-new',
    )
  })

  it('calls one unknown step among known ones too new', () => {
    expect(
      checkFlow(flow({ steps: [step, { id: 's2', type: 'scroll', text: 'Scroll down' }] })),
    ).toBe('too-new')
  })

  it('calls an older format malformed, since it cannot be read', () => {
    expect(checkFlow(flow({ schemaVersion: SCHEMA_VERSION - 1 }))).toBe('malformed')
  })

  it('calls a missing or nonsense version malformed', () => {
    expect(checkFlow(flow({ schemaVersion: undefined }))).toBe('malformed')
    expect(checkFlow(flow({ schemaVersion: 'one' }))).toBe('malformed')
  })

  it('refuses anything that is not an object', () => {
    for (const value of [null, undefined, 'flow', 42, []]) {
      expect(checkFlow(value)).toBe('malformed')
    }
  })

  it('refuses a flow with no name, id or steps', () => {
    expect(checkFlow(flow({ name: '' }))).toBe('malformed')
    expect(checkFlow(flow({ id: '' }))).toBe('malformed')
    expect(checkFlow(flow({ steps: [] }))).toBe('malformed')
  })

  it('refuses a step of a known type that is missing what it needs', () => {
    expect(checkFlow(flow({ steps: [{ id: 's1', type: 'action', text: 'Click' }] }))).toBe(
      'malformed',
    )
    expect(
      checkFlow(flow({ steps: [{ id: 's1', type: 'action', text: 'Click', target: {} }] })),
    ).toBe('malformed')
  })

  it('accepts an instruction step, which points at nothing', () => {
    expect(checkFlow(flow({ steps: [{ id: 's1', type: 'instruction', text: 'Read this' }] }))).toBe(
      'ok',
    )
  })
})

describe('looksLikeFlow', () => {
  it('is true only for a flow this build can play', () => {
    expect(looksLikeFlow(flow())).toBe(true)
    expect(looksLikeFlow(flow({ schemaVersion: SCHEMA_VERSION + 1 }))).toBe(false)
    expect(looksLikeFlow(null)).toBe(false)
  })
})
