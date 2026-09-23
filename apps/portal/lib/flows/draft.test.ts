import { describe, expect, it } from 'vitest'
import type { Step } from '@wendmark/core'
import { isWithinSizeLimit, MAX_BODY_BYTES, MAX_STEPS, readDraftRequest } from './draft'

/** A step that passes the real schema, so the tests exercise it. */
function step(id: string): Step {
  return {
    id,
    type: 'action',
    text: 'Open the cart',
    dynamic: false,
    target: { selectors: ['#cart'], role: 'button', name: 'Cart' },
  }
}

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sessionToken: 'a-session-token',
    flow: { schemaVersion: 1, id: 'draft-1', name: 'Order coffee', steps: [step('s1')] },
    ...overrides,
  }
}

describe('isWithinSizeLimit', () => {
  it('accepts a recording of an ordinary size', () => {
    expect(isWithinSizeLimit(4_000)).toBe(true)
  })

  it('accepts a body exactly at the limit', () => {
    expect(isWithinSizeLimit(MAX_BODY_BYTES)).toBe(true)
  })

  it('refuses one byte more', () => {
    expect(isWithinSizeLimit(MAX_BODY_BYTES + 1)).toBe(false)
  })
})

describe('readDraftRequest', () => {
  it('reads a recording and its session', () => {
    const result = readDraftRequest(request())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.request.sessionToken).toBe('a-session-token')
    expect(result.request.flow.name).toBe('Order coffee')
    expect(result.request.flow.steps).toHaveLength(1)
  })

  it('refuses anything that is not an object', () => {
    for (const body of [null, 'a string', 42, undefined]) {
      expect(readDraftRequest(body).ok).toBe(false)
    }
  })

  it('refuses a request with no session token', () => {
    expect(readDraftRequest(request({ sessionToken: '' })).ok).toBe(false)
    expect(readDraftRequest(request({ sessionToken: 123 })).ok).toBe(false)
  })

  it('says nothing about the session when it is missing', () => {
    const result = readDraftRequest(request({ sessionToken: '' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.toLowerCase()).not.toContain('session')
  })

  it('refuses a flow with no steps', () => {
    const result = readDraftRequest(
      request({ flow: { schemaVersion: 1, id: 'draft-1', name: 'Empty', steps: [] } }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('steps')
  })

  it('refuses a flow with no name', () => {
    expect(
      readDraftRequest(
        request({ flow: { schemaVersion: 1, id: 'draft-1', name: '', steps: [step('s1')] } }),
      ).ok,
    ).toBe(false)
  })

  it('refuses a step that is not a step', () => {
    const result = readDraftRequest(
      request({
        flow: { schemaVersion: 1, id: 'draft-1', name: 'Bad', steps: [{ id: 's1' }] },
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('steps.0')
  })

  it('refuses a recorded value smuggled onto a target', () => {
    const result = readDraftRequest(
      request({
        flow: {
          schemaVersion: 1,
          id: 'draft-1',
          name: 'Sneaky',
          steps: [
            {
              ...step('s1'),
              target: { selectors: ['#card'], role: 'textbox', name: 'Card', value: '4111' },
            },
          ],
        },
      }),
    )
    expect(result.ok).toBe(false)
  })

  it('refuses two steps with the same id', () => {
    const result = readDraftRequest(
      request({
        flow: { schemaVersion: 1, id: 'draft-1', name: 'Twice', steps: [step('s1'), step('s1')] },
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Duplicate')
  })

  it('accepts a recording at the step limit', () => {
    const steps = Array.from({ length: MAX_STEPS }, (_, index) => step(`s${index + 1}`))
    expect(
      readDraftRequest(request({ flow: { schemaVersion: 1, id: 'd', name: 'Long', steps } })).ok,
    ).toBe(true)
  })

  it('refuses a runaway recording', () => {
    const steps = Array.from({ length: MAX_STEPS + 1 }, (_, index) => step(`s${index + 1}`))
    const result = readDraftRequest(
      request({ flow: { schemaVersion: 1, id: 'd', name: 'Runaway', steps } }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain(String(MAX_STEPS))
  })

  it('refuses a flow from a format this portal does not know', () => {
    expect(
      readDraftRequest(
        request({ flow: { schemaVersion: 99, id: 'd', name: 'Future', steps: [step('s1')] } }),
      ).ok,
    ).toBe(false)
  })
})
