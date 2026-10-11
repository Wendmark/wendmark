import type { Flow } from '@wendmark/core'
import { afterEach, describe, expect, it } from 'vitest'
import { OVERLAY_TAG } from './overlay/overlay'
import { setRect } from './test-utils'
import { closeLauncher, openLauncher, start, stop } from './index'

const flow: Flow = {
  schemaVersion: 1,
  id: 'save-profile',
  name: 'Save your profile',
  steps: [
    {
      type: 'action',
      id: 's1',
      text: 'Click Save changes',
      dynamic: false,
      target: { selectors: ['#save'], role: 'button', name: 'Save changes' },
    },
  ],
}

function renderPage(): void {
  document.body.innerHTML = '<button id="save" type="button">Save changes</button>'
  setRect(document.getElementById('save') as Element, { left: 0, top: 0, width: 90, height: 24 })
}

afterEach(() => {
  stop()
  document.body.innerHTML = ''
})

describe('the snippet API', () => {
  it('starts guiding from a flow', () => {
    renderPage()
    start(flow)
    expect(document.querySelector(OVERLAY_TAG)).not.toBeNull()
  })

  it('stops guiding and leaves no trace', () => {
    renderPage()
    start(flow)
    stop()
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('replaces a flow already running instead of stacking them', () => {
    renderPage()
    start(flow)
    start(flow)
    expect(document.querySelectorAll(OVERLAY_TAG)).toHaveLength(1)
  })

  it('refuses a flow that does not fit the schema', () => {
    renderPage()
    expect(() => start({ id: 'nope' } as unknown as Flow)).toThrow(/flow/i)
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('says so when a process was made with a newer Wendmark', () => {
    renderPage()
    const newer = { ...flow, schemaVersion: 99 } as unknown as Flow

    // Not the same as a broken flow: nothing is wrong with it, this copy of
    // the snippet is simply out of date.
    expect(() => start(newer)).toThrow(/newer version/i)
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('does nothing when stopping twice', () => {
    renderPage()
    start(flow)
    stop()
    expect(() => stop()).not.toThrow()
  })

  it('tells the caller when a flow ends, however it ended', () => {
    renderPage()
    let ended = 0
    start(flow, { onEnd: () => (ended += 1) })
    stop()
    expect(ended).toBe(1)
  })

  it('opens the launcher again after the user closes it themselves', async () => {
    const dialog = () =>
      [...document.querySelectorAll(OVERLAY_TAG)]
        .map((host) => host.shadowRoot?.querySelector('[role="dialog"]'))
        .find(Boolean)

    await openLauncher()
    dialog()?.querySelector<HTMLButtonElement>('.bar')?.click()
    expect(dialog()).toBeUndefined()

    await openLauncher()
    expect(dialog()).toBeDefined()
    closeLauncher()
  })
})
