import type { Flow } from '@wendmark/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { QUICK_INTERVAL_MS, startFlow, type Player } from './player'

let player: Player | null = null

/** A step recorded on the Profile page of this (jsdom) origin. */
function flowOnProfile(): Flow {
  return {
    schemaVersion: 1,
    id: 'change-grind',
    name: 'Change your grind',
    steps: [
      {
        type: 'action',
        id: 's1',
        text: 'Open the Grind dropdown',
        dynamic: false,
        target: {
          selectors: ['select[name="grind"]'],
          role: 'combobox',
          name: 'Grind',
          url: `${location.origin}/profile`,
        },
      },
    ],
  }
}

function status(): string {
  const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
  return root?.querySelector('[data-wendmark="status"]')?.textContent ?? ''
}

beforeEach(() => {
  vi.useFakeTimers()
  history.pushState({}, '', '/orders')
  document.body.innerHTML = '<h1>Orders</h1>'
})

afterEach(() => {
  player?.stop()
  player = null
  vi.useRealTimers()
  history.pushState({}, '', '/')
  document.body.innerHTML = ''
})

describe('steps that live on another page', () => {
  it('says where the step is, instead of just "not found"', () => {
    player = startFlow(flowOnProfile(), { doc: document, view: window })
    expect(status()).toContain('/profile')
    expect(status()).not.toContain("Can't find")
  })

  it('says it straight away, without a hopeful pause', () => {
    player = startFlow(flowOnProfile(), { doc: document, view: window })
    expect(status()).not.toBe('Looking for this step…')
  })

  it('goes back to looking once the user is on the right page', () => {
    player = startFlow(flowOnProfile(), { doc: document, view: window })
    history.pushState({}, '', '/profile')
    vi.advanceTimersByTime(QUICK_INTERVAL_MS)
    expect(status()).toBe('Looking for this step…')
  })

  it('still looks quietly when the step names no page', () => {
    const flow = flowOnProfile()
    const step = flow.steps[0]
    if (step?.type !== 'action') throw new Error('expected an action step')
    delete step.target.url

    player = startFlow(flow, { doc: document, view: window })
    expect(status()).toBe('Looking for this step…')
  })
})
