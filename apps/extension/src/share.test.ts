// @vitest-environment jsdom
import type { Flow, Step } from '@wendmark/core'
import { startRecording } from '@wendmark/snippet/engine'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SHARE, readShare, shareable } from './share'

const flow: Flow = {
  schemaVersion: 1,
  id: 'draft-1',
  name: 'Refund an order',
  steps: [
    {
      type: 'action',
      id: 's1',
      text: 'Click Order FK-10421',
      dynamic: true,
      target: {
        selectors: ['tr:nth-of-type(3) > td > a'],
        role: 'link',
        name: 'Order FK-10421',
        text: 'FK-10421',
        context: 'Orders for Anna Lindqvist',
        url: '/orders/10421',
      },
    },
    {
      type: 'input',
      id: 's2',
      text: 'Fill in Quantity',
      target: {
        selectors: ['#quantity'],
        role: 'spinbutton',
        name: 'Quantity',
        url: '/orders/10421',
      },
    },
    {
      type: 'action',
      id: 's3',
      text: 'Click Refund',
      dynamic: false,
      target: {
        selectors: ['[data-testid="refund"]'],
        testId: 'refund',
        role: 'button',
        name: 'Refund',
      },
    },
  ],
}

/** Every string anywhere in a value, for "is this word in there at all". */
function everything(value: unknown): string {
  return JSON.stringify(value)
}

describe('shareable', () => {
  it('under structure only, carries no words from the page', () => {
    const shared = shareable(flow, DEFAULT_SHARE)
    // The steps, that is. The guide's name is the sharer's own, typed by
    // them and shown in the preview, so it stays as they wrote it.
    expect(shared?.name).toBe('Refund an order')
    const text = everything(shared?.steps)
    for (const word of ['FK-10421', '10421', 'Anna', 'Lindqvist', 'Quantity', 'Refund']) {
      expect(text).not.toContain(word)
    }
    // What finds the control again is still there, so it still plays.
    expect(shared?.steps.map((step) => step.type)).toEqual(['action', 'input', 'action'])
    const first = shared?.steps[0]
    expect(first?.type === 'action' && first.target.url).toBe('/orders/*')
  })

  it('keeps the words when asked to', () => {
    const shared = shareable(flow, { ...DEFAULT_SHARE, labels: 'all' })
    expect(shared?.steps[0]?.text).toBe('Click Order FK-10421')
  })

  it('leaves out the steps taken out', () => {
    const shared = shareable(flow, { ...DEFAULT_SHARE, removed: ['s1'] })
    expect(shared?.steps.map((step) => step.id)).toEqual(['s2', 's3'])
    expect(shareable(flow, { ...DEFAULT_SHARE, removed: ['s1', 's2', 's3'] })).toBeNull()
  })

  it('adds the sharer’s note to its step, masked or not', () => {
    const shared = shareable(flow, { ...DEFAULT_SHARE, notes: { s2: 'type −1 here' } })
    expect(shared?.steps[1]?.text).toMatch(/ — type −1 here$/)
  })

  it('drops anything stored beside a step that the format does not have', () => {
    const smuggled = {
      ...flow,
      steps: flow.steps.map((step) =>
        step.type === 'input'
          ? ({ ...step, value: 'hunter2', target: { ...step.target, value: 'hunter2' } } as Step)
          : step,
      ),
    }
    expect(everything(shareable(smuggled, { ...DEFAULT_SHARE, labels: 'all' }))).not.toContain(
      'hunter2',
    )
  })
})

describe('typed values never reach a shared guide', () => {
  it('records typing with the real recorder, and the typed text is nowhere in what is shared', () => {
    document.body.innerHTML = `
      <form>
        <label>Quantity <input id="quantity" name="quantity" type="text"></label>
        <label>Reason <textarea id="reason"></textarea></label>
        <button id="refund" type="button">Refund</button>
      </form>`
    const recording = startRecording({ doc: document, view: window })

    for (const [id, typed] of [
      ['quantity', '-1'],
      ['reason', 'customer hunter2 complained'],
    ] as const) {
      const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
      field.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      field.value = typed
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
    }
    document.getElementById('refund')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const recorded = recording.stop()
    expect(recorded.steps.length).toBeGreaterThan(0)

    for (const labels of ['none', 'all'] as const) {
      const text = everything(shareable(recorded, { ...DEFAULT_SHARE, labels }))
      expect(text).not.toContain('hunter2')
      expect(text).not.toContain('"-1"')
    }
  })
})

describe('readShare', () => {
  it('defaults to structure only, and reads only what it knows', () => {
    expect(readShare(undefined)).toEqual(DEFAULT_SHARE)
    expect(
      readShare({ labels: 'everything', removed: ['s1', 2], notes: { s1: '  hi  ', s2: 3 } }),
    ).toEqual({ labels: 'none', removed: ['s1'], notes: { s1: 'hi' } })
  })
})
