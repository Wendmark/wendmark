import type { Flow } from '@wendmark/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { setRect } from '../test-utils'
import {
  QUICK_ATTEMPTS,
  QUICK_INTERVAL_MS,
  SLOW_INTERVAL_MS,
  startFlow,
  type Player,
} from './player'

let player: Player | null = null

const flow: Flow = {
  schemaVersion: 1,
  id: 'later',
  name: 'A step that is not there yet',
  steps: [
    {
      type: 'action',
      id: 's1',
      text: 'Click Save changes',
      dynamic: false,
      target: { selectors: ['#save'], role: 'button', name: 'Save changes' },
    },
    { type: 'instruction', id: 's2', text: 'All done.' },
  ],
}

function panelText(part: string): string {
  const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
  return root?.querySelector(`[data-wendmark="${part}"]`)?.textContent ?? ''
}

function ringVisible(): boolean {
  const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
  const ring = root?.querySelector('[data-wendmark="ring"]') as HTMLElement | null
  return ring?.style.display === 'block'
}

/** Put the missing button on the page, as an app would after loading. */
function addSaveButton(): void {
  document.body.innerHTML = '<button id="save" type="button">Save changes</button>'
  setRect(document.getElementById('save') as Element, {
    left: 10,
    top: 10,
    width: 100,
    height: 30,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = '<p>The app is still loading…</p>'
})

afterEach(() => {
  player?.stop()
  player = null
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('waiting for a step to appear', () => {
  it('says it is looking, without alarming anyone', () => {
    player = startFlow(flow, { doc: document, view: window })
    expect(panelText('status')).toBe('Looking for this step…')
  })

  it('picks the step up as soon as it appears', () => {
    player = startFlow(flow, { doc: document, view: window })
    addSaveButton()
    vi.advanceTimersByTime(QUICK_INTERVAL_MS)

    expect(ringVisible()).toBe(true)
    expect(panelText('status')).toBe('')
  })

  it('explains itself after a few quiet attempts', () => {
    player = startFlow(flow, { doc: document, view: window })
    vi.advanceTimersByTime(QUICK_INTERVAL_MS * (QUICK_ATTEMPTS + 1))

    expect(panelText('status')).toContain("Can't find this step")
  })

  it('keeps looking in the background, and resumes on its own', () => {
    player = startFlow(flow, { doc: document, view: window })
    vi.advanceTimersByTime(QUICK_INTERVAL_MS * (QUICK_ATTEMPTS + 1))

    addSaveButton()
    vi.advanceTimersByTime(SLOW_INTERVAL_MS * 2)

    expect(ringVisible()).toBe(true)
    expect(panelText('status')).toBe('')
  })

  it('lets the user move on instead of waiting', () => {
    player = startFlow(flow, { doc: document, view: window })
    const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
    ;(root?.querySelector('[data-wendmark="skip"]') as HTMLButtonElement).click()

    expect(panelText('progress')).toBe('2 / 2')
    expect(panelText('step-text')).toBe('All done.')
  })

  it('stops looking once guidance is stopped', () => {
    player = startFlow(flow, { doc: document, view: window })
    player.stop()
    player = null

    addSaveButton()
    vi.advanceTimersByTime(SLOW_INTERVAL_MS * 5)

    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('does not keep looking for a step the user already passed', () => {
    player = startFlow(flow, { doc: document, view: window })
    const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
    ;(root?.querySelector('[data-wendmark="skip"]') as HTMLButtonElement).click()

    addSaveButton()
    vi.advanceTimersByTime(SLOW_INTERVAL_MS * 3)

    // Still on the instruction step; the old step must not grab guidance back.
    expect(panelText('progress')).toBe('2 / 2')
    expect(ringVisible()).toBe(false)
  })
})
