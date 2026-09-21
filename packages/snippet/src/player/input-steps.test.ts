import type { Flow } from '@wendmark/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { setRect } from '../test-utils'
import { startFlow, type Player } from './player'

let player: Player | null = null

const flow: Flow = {
  schemaVersion: 1,
  id: 'update-email',
  name: 'Update your email',
  steps: [
    {
      type: 'input',
      id: 'i1',
      text: 'Enter your email',
      target: { selectors: ['#email'], role: 'textbox', name: 'Email' },
    },
    {
      type: 'action',
      id: 'a1',
      text: 'Click Save changes',
      dynamic: false,
      target: { selectors: ['#save'], role: 'button', name: 'Save changes' },
    },
  ],
}

function renderPage(): void {
  document.body.innerHTML = `
    <form class="form">
      <label>Email <input id="email" name="email" type="email"></label>
      <button id="save" type="button">Save changes</button>
    </form>
  `
  for (const id of ['email', 'save']) {
    setRect(document.getElementById(id) as Element, { left: 0, top: 0, width: 200, height: 30 })
  }
}

function root(): ShadowRoot {
  const found = document.querySelector(OVERLAY_TAG)?.shadowRoot
  if (!found) throw new Error('no overlay')
  return found
}

function panelText(part: string): string {
  return root().querySelector(`[data-wendmark="${part}"]`)?.textContent ?? ''
}

function ringVisible(): boolean {
  const ring = root().querySelector('[data-wendmark="ring"]') as HTMLElement | null
  return ring?.style.display === 'block'
}

afterEach(() => {
  player?.stop()
  player = null
  document.body.innerHTML = ''
})

describe('input steps', () => {
  it('points at the field to fill in', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })
    expect(panelText('step-text')).toBe('Enter your email')
    expect(ringVisible()).toBe(true)
  })

  it('does not advance merely because the field was clicked', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })
    document.getElementById('email')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(panelText('progress')).toBe('1 / 2')
  })

  it('advances once the user has filled it in', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })

    const email = document.getElementById('email') as HTMLInputElement
    email.value = 'alex@example.com'
    email.dispatchEvent(new Event('change', { bubbles: true }))

    expect(panelText('progress')).toBe('2 / 2')
    expect(panelText('step-text')).toBe('Click Save changes')
  })

  it('never looks at what was typed', () => {
    renderPage()
    const email = document.getElementById('email') as HTMLInputElement
    const readValue = vi.fn(() => 'alex@example.com')
    Object.defineProperty(email, 'value', { get: readValue, set: () => {}, configurable: true })

    player = startFlow(flow, { doc: document, view: window })
    email.dispatchEvent(new Event('change', { bubbles: true }))

    expect(panelText('progress')).toBe('2 / 2')
    expect(readValue).not.toHaveBeenCalled()
  })

  it('offers a way on for someone who does not leave the field', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })
    expect(panelText('primary')).toBe('Done')
    ;(root().querySelector('[data-wendmark="primary"]') as HTMLButtonElement).click()
    expect(panelText('progress')).toBe('2 / 2')
  })

  it('ignores a change somewhere else on the page', () => {
    renderPage()
    document.body.insertAdjacentHTML('beforeend', '<input id="other">')
    player = startFlow(flow, { doc: document, view: window })

    document.getElementById('other')?.dispatchEvent(new Event('change', { bubbles: true }))
    expect(panelText('progress')).toBe('1 / 2')
  })

  it('does not advance an action step on a change event', () => {
    renderPage()
    player = startFlow(flow, { doc: document, view: window })
    const email = document.getElementById('email') as HTMLInputElement
    email.dispatchEvent(new Event('change', { bubbles: true }))
    expect(panelText('progress')).toBe('2 / 2')

    document.getElementById('save')?.dispatchEvent(new Event('change', { bubbles: true }))
    expect(panelText('progress')).toBe('2 / 2')
  })
})
