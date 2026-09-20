import type { Flow } from '@wendmark/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { setRect } from '../test-utils'
import { startFlow, type Player } from './player'

let player: Player | null = null

/** Fika's profile form, with positions so the ring has somewhere to go. */
function renderPage(): void {
  document.body.innerHTML = `
    <nav><a href="/profile" id="profile-link">Profile</a></nav>
    <form class="form">
      <label>Email <input id="email" name="email"></label>
      <button id="save" type="button">Save changes</button>
      <button id="cancel" type="button">Cancel</button>
    </form>
  `
  for (const id of ['profile-link', 'email', 'save', 'cancel']) {
    setRect(document.getElementById(id) as Element, { left: 10, top: 10, width: 100, height: 30 })
  }
}

const flow: Flow = {
  schemaVersion: 1,
  id: 'update-address',
  name: 'Update your address',
  steps: [
    {
      type: 'action',
      id: 's1',
      text: 'Go to Profile',
      dynamic: false,
      target: { selectors: ['#profile-link'], role: 'link', name: 'Profile' },
    },
    {
      type: 'action',
      id: 's2',
      text: 'Click Save changes',
      dynamic: false,
      target: { selectors: ['#save'], role: 'button', name: 'Save changes' },
    },
  ],
}

function panelText(part: string): string {
  const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
  return root?.querySelector(`[data-wendmark="${part}"]`)?.textContent ?? ''
}

function click(id: string): void {
  document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

afterEach(() => {
  player?.stop()
  player = null
  document.body.innerHTML = ''
})

describe('startFlow', () => {
  it('shows the first step and highlights its target', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })

    expect(panelText('progress')).toBe('1 / 2')
    expect(panelText('step-text')).toBe('Go to Profile')
    const ring = document
      .querySelector(OVERLAY_TAG)
      ?.shadowRoot?.querySelector('[data-wendmark="ring"]') as HTMLElement
    expect(ring.style.display).toBe('block')
  })

  it('advances when the user clicks the target themselves', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })

    click('profile-link')

    expect(panelText('progress')).toBe('2 / 2')
    expect(panelText('step-text')).toBe('Click Save changes')
  })

  it('advances when the click lands on something inside the target', () => {
    renderPage()
    const save = document.getElementById('save') as HTMLElement
    save.innerHTML = '<span id="inner">Save changes</span>'
    player = startFlow(flow, { doc: document, view: window })

    click('profile-link')
    click('inner')

    expect(panelText('progress')).toBe('')
  })

  it('ignores clicks on anything else', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })

    click('cancel')
    click('email')

    expect(panelText('progress')).toBe('1 / 2')
  })

  it('finishes after the last step and cleans up', () => {
    renderPage()
    const onFinish = vi.fn<() => void>()
    player = startFlow(flow, { doc: document, view: window, onFinish })

    click('profile-link')
    click('save')

    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('never clicks anything itself', () => {
    renderPage()
    const clicked = vi.fn<() => void>()
    document.getElementById('save')?.addEventListener('click', clicked)

    player = startFlow(flow, { doc: document, view: window })

    expect(clicked).not.toHaveBeenCalled()
  })

  it('moves on when the user skips a step', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })

    const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
    ;(root?.querySelector('[data-wendmark="skip"]') as HTMLButtonElement).click()

    expect(panelText('progress')).toBe('2 / 2')
  })

  it('stops and disappears when the user stops it', () => {
    renderPage()
    const onStop = vi.fn<() => void>()
    player = startFlow(flow, { doc: document, view: window, onStop })

    const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
    ;(root?.querySelector('[data-wendmark="stop"]') as HTMLButtonElement).click()

    expect(onStop).toHaveBeenCalledTimes(1)
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })

  it('stops listening once it has finished', () => {
    renderPage()
    const onFinish = vi.fn<() => void>()
    player = startFlow(flow, { doc: document, view: window, onFinish })

    click('profile-link')
    click('save')
    click('save')

    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('says so when a step is not on the page', () => {
    document.body.innerHTML = '<p>Some other page entirely</p>'
    player = startFlow(flow, { doc: document, view: window })

    expect(panelText('progress')).toBe('1 / 2')
    expect(panelText('status')).not.toBe('')
  })
})
