import type { Flow } from '@wendmark/core'
import { afterEach, describe, expect, it } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { setRect } from '../test-utils'
import { resume, start, stop } from '../index'
import { loadProgress } from './progress'

const flow: Flow = {
  schemaVersion: 1,
  id: 'change-grind',
  name: 'Change your grind',
  steps: [
    {
      type: 'action',
      id: 's1',
      text: 'Open your Profile',
      dynamic: false,
      target: { selectors: ['#profile'], role: 'link', name: 'Profile' },
    },
    {
      type: 'action',
      id: 's2',
      text: 'Click Save changes',
      dynamic: false,
      target: { selectors: ['#save'], role: 'button', name: 'Save changes' },
    },
    { type: 'instruction', id: 's3', text: 'All done.' },
  ],
}

function renderPage(): void {
  document.body.innerHTML = `
    <a id="profile" href="/profile">Profile</a>
    <button id="save" type="button">Save changes</button>
  `
  for (const id of ['profile', 'save']) {
    setRect(document.getElementById(id) as Element, { left: 0, top: 0, width: 80, height: 20 })
  }
}

function panelText(part: string): string {
  const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
  return root?.querySelector(`[data-wendmark="${part}"]`)?.textContent ?? ''
}

function click(id: string): void {
  document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

afterEach(() => {
  stop()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

describe('surviving a page load', () => {
  it('remembers the step the user is on', () => {
    renderPage()
    start(flow)
    expect(loadProgress(sessionStorage)).toEqual({ flowId: 'change-grind', stepIndex: 0 })

    click('profile')
    expect(loadProgress(sessionStorage)).toEqual({ flowId: 'change-grind', stepIndex: 1 })
  })

  it('forgets once the flow is finished', () => {
    renderPage()
    start(flow)
    click('profile')
    click('save')
    const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
    ;(root?.querySelector('[data-wendmark="primary"]') as HTMLButtonElement).click()

    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('forgets when the user stops', () => {
    renderPage()
    start(flow)
    stop()
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('picks the flow up again on the next page load', () => {
    renderPage()
    start(flow)
    click('profile')

    // A reload: the overlay is gone, only storage remains.
    stop({ keepProgress: true })
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()

    const player = resume([flow])
    expect(player).not.toBeNull()
    expect(panelText('progress')).toBe('2 / 3')
    expect(panelText('step-text')).toBe('Click Save changes')
  })

  it('does nothing when there is nothing to resume', () => {
    renderPage()
    expect(resume([flow])).toBeNull()
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('does nothing when it was not given that flow, and forgets nothing', () => {
    renderPage()
    start(flow)
    stop({ keepProgress: true })

    // The caller not holding this flow is not evidence that it is gone: the
    // portal serves flows the app has never seen. Clearing here would take
    // someone's place away from the part of the snippet that can restore it.
    expect(resume([{ ...flow, id: 'a-different-flow' }])).toBeNull()
    expect(loadProgress(sessionStorage)).not.toBeNull()
  })

  it('forgets progress when the flow it was given has changed shape', () => {
    renderPage()
    start(flow)
    stop({ keepProgress: true })

    const shortened = { ...flow, steps: [] } as unknown as Flow
    expect(resume([shortened])).toBeNull()
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('does nothing when the saved step no longer exists', () => {
    renderPage()
    start(flow)
    click('profile') // now on step 2 of 3
    stop({ keepProgress: true })

    const shortened: Flow = { ...flow, steps: [flow.steps[0]] as Flow['steps'] }
    expect(resume([shortened])).toBeNull()
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('accepts a single flow as well as a list', () => {
    renderPage()
    start(flow)
    click('profile')
    stop({ keepProgress: true })

    expect(resume(flow)).not.toBeNull()
    expect(panelText('progress')).toBe('2 / 3')
  })
})
