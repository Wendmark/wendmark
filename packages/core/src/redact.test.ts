import { describe, expect, it } from 'vitest'
import { DEFAULT_LABEL_POLICY, maskPath, readLabelPolicy, redactStep, redactSteps } from './redact'
import { ReportSchema } from './report'
import type { ActionStep, InputStep, Step } from './schemas'

/**
 * What a report keeps and what it drops.
 *
 * The thing worth guarding against is a field quietly surviving: a step that
 * still says "Order FK-10421" in a database an operator believed held
 * structure only. So these tests assert on absences as much as on values.
 */

function action(target: Partial<ActionStep['target']> = {}): ActionStep {
  return {
    type: 'action',
    id: 's1',
    text: 'Go to Order FK-10421',
    dynamic: true,
    target: {
      selectors: ['table tr:nth-of-type(2) > td > a'],
      role: 'link',
      name: 'Order FK-10421',
      text: 'FK-10421',
      context: "Alex Lindqvist's orders",
      url: '/orders/10421',
      ...target,
    },
  }
}

describe('taking the labels off a step', () => {
  it('drops everything the page said', () => {
    const step = redactStep(action(), 'none')

    expect(step.type).toBe('action')
    if (step.type === 'instruction') throw new Error('unreachable')
    expect(step.target.name).toBeUndefined()
    expect(step.target.text).toBeUndefined()
    expect(step.target.context).toBeUndefined()
    // And not as a key holding undefined, which would survive JSON.
    expect(Object.keys(step.target)).not.toContain('name')
  })

  it('keeps what finds the element again', () => {
    const step = redactStep(action({ testId: 'order-link', shadowPath: ['my-table', 'a'] }), 'none')
    if (step.type === 'instruction') throw new Error('unreachable')

    expect(step.target.selectors).toEqual(['table tr:nth-of-type(2) > td > a'])
    expect(step.target.role).toBe('link')
    expect(step.target.testId).toBe('order-link')
    expect(step.target.shadowPath).toEqual(['my-table', 'a'])
  })

  it('rewrites the step text, because that held the data too', () => {
    // The recorder built "Go to Order FK-10421" out of the accessible name.
    // Stripping the target and leaving the sentence would strip nothing.
    expect(redactStep(action(), 'none').text).toBe('Follow a link')
  })

  it('masks the id out of the page it happened on', () => {
    const step = redactStep(action(), 'none')
    if (step.type === 'instruction') throw new Error('unreachable')
    expect(step.target.url).toBe('/orders/*')
  })

  it('leaves a step alone when the app has opted into labels', () => {
    expect(redactStep(action(), 'all')).toEqual(action())
  })

  it('keeps the step id and the dynamic guess either way', () => {
    const step = redactStep(action(), 'none')
    if (step.type !== 'action') throw new Error('unreachable')
    expect(step.id).toBe('s1')
    expect(step.dynamic).toBe(true)
  })
})

describe('how a stripped step reads', () => {
  const cases: [string, string][] = [
    ['link', 'Follow a link'],
    ['button', 'Press a button'],
    ['checkbox', 'Tick a box'],
    ['tab', 'Switch to another tab'],
  ]

  it.each(cases)('a %s becomes "%s"', (role, expected) => {
    expect(redactStep(action({ role }), 'none').text).toBe(expected)
  })

  it('says something rather than nothing for a role it has no phrase for', () => {
    expect(redactStep(action({ role: 'gridcell' }), 'none').text).toBe(
      'Click something on the page',
    )
  })

  it('says something when there is no role at all', () => {
    const step = action()
    delete step.target.role
    expect(redactStep(step, 'none').text).toBe('Click something on the page')
  })

  it('describes filling a field as filling a field', () => {
    const input: InputStep = {
      type: 'input',
      id: 's2',
      text: 'Enter your Delivery address',
      target: { selectors: ['#address'], role: 'textbox', name: 'Delivery address' },
    }
    expect(redactStep(input, 'none').text).toBe('Fill in a field')
  })

  it('leaves an instruction step as written, having no target to strip', () => {
    const instruction: Step = { type: 'instruction', id: 's3', text: 'Wait for the email' }
    expect(redactStep(instruction, 'none')).toEqual(instruction)
  })
})

describe('masking a path', () => {
  it.each([
    ['/orders/10421', '/orders/*'],
    ['/orders', '/orders'],
    ['/', '/'],
    ['', '/'],
    ['/users/8f3ab2c1-0d44-4b2e-9a71-5c6e8d0f1a23/settings', '/users/*/settings'],
    ['/invoices/2026/03', '/invoices/*/*'],
  ])('%s becomes %s', (path, expected) => {
    expect(maskPath(path)).toBe(expected)
  })
})

describe('which policy applies', () => {
  it('defaults to keeping nothing', () => {
    expect(DEFAULT_LABEL_POLICY).toBe('none')
  })

  it.each([[undefined], [null], ['fixed-only'], [''], [7], [{}]])(
    'falls back to the cautious policy for %p',
    (raw) => {
      expect(readLabelPolicy(raw)).toBe('none')
    },
  )

  it('takes a policy it recognises', () => {
    expect(readLabelPolicy('all')).toBe('all')
    expect(readLabelPolicy('none')).toBe('none')
  })
})

describe('a redacted report as the schema sees it', () => {
  it('is still a valid report', () => {
    const report = {
      reportVersion: 1,
      note: 'Refunding an order does nothing.',
      steps: redactSteps([action()], 'none'),
      pages: ['/orders/*'],
      labels: 'none',
    }
    expect(ReportSchema.safeParse(report).success).toBe(true)
  })

  it('refuses a key nobody declared', () => {
    const report = {
      reportVersion: 1,
      note: 'Refunding an order does nothing.',
      steps: redactSteps([action()], 'none'),
      pages: [],
      labels: 'none',
      // Exactly the sort of thing a strict schema is for.
      screenshot: 'data:image/png;base64,…',
    }
    expect(ReportSchema.safeParse(report).success).toBe(false)
  })

  it('refuses a step that smuggled a value in', () => {
    const report = {
      reportVersion: 1,
      note: 'The address field rejects my postcode.',
      steps: [{ ...action(), target: { selectors: ['#postcode'], value: '112 23' } }],
      pages: [],
      labels: 'none',
    }
    expect(ReportSchema.safeParse(report).success).toBe(false)
  })

  it('wants a word from the person sending it', () => {
    const report = {
      reportVersion: 1,
      note: '   ',
      steps: redactSteps([action()], 'none'),
      pages: [],
      labels: 'none',
    }
    expect(ReportSchema.safeParse(report).success).toBe(false)
  })
})
