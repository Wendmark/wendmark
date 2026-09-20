import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createOverlay, type Overlay } from '../overlay/overlay'
import { createPanel, type Panel } from './panel'

let overlay: Overlay
let panel: Panel
let onSkip: Mock<() => void>
let onStop: Mock<() => void>
let onPrimary: Mock<() => void>

beforeEach(() => {
  overlay = createOverlay(document)
  onSkip = vi.fn<() => void>()
  onStop = vi.fn<() => void>()
  onPrimary = vi.fn<() => void>()
  panel = createPanel(overlay.root, document, { onSkip, onStop, onPrimary })
})

afterEach(() => {
  overlay.destroy()
  document.body.innerHTML = ''
})

function panelElement(): HTMLElement | null {
  return overlay.root.querySelector('[data-wendmark="panel"]')
}

function partText(part: string): string {
  return overlay.root.querySelector(`[data-wendmark="${part}"]`)?.textContent ?? ''
}

function button(part: string): HTMLButtonElement {
  const found = overlay.root.querySelector(`[data-wendmark="${part}"]`)
  if (!found) throw new Error(`no ${part} button`)
  return found as HTMLButtonElement
}

describe('createPanel', () => {
  it('stays out of the way until guidance starts', () => {
    expect(panelElement()?.style.display).toBe('none')
  })

  it('shows the step text and how far along we are', () => {
    panel.show({ stepNumber: 2, total: 5, text: 'Click Save changes' })
    expect(panelElement()?.style.display).not.toBe('none')
    expect(partText('progress')).toBe('2 / 5')
    expect(partText('step-text')).toBe('Click Save changes')
  })

  it('updates when the step changes', () => {
    panel.show({ stepNumber: 1, total: 3, text: 'Go to Profile' })
    panel.show({ stepNumber: 2, total: 3, text: 'Click the address field' })
    expect(partText('progress')).toBe('2 / 3')
    expect(partText('step-text')).toBe('Click the address field')
  })

  it('treats step text as text, never as markup', () => {
    panel.show({ stepNumber: 1, total: 1, text: '<img src=x onerror="alert(1)">' })
    expect(overlay.root.querySelector('img')).toBeNull()
    expect(partText('step-text')).toBe('<img src=x onerror="alert(1)">')
  })

  it('can say something instead of a step, while looking for one', () => {
    panel.show({ stepNumber: 1, total: 4, text: 'Click Save changes' })
    panel.setStatus('Looking for this step…')
    expect(partText('status')).toBe('Looking for this step…')
  })

  it('clears its status when the step moves on', () => {
    panel.show({ stepNumber: 1, total: 4, text: 'One' })
    panel.setStatus('Looking for this step…')
    panel.show({ stepNumber: 2, total: 4, text: 'Two' })
    expect(partText('status')).toBe('')
  })

  it('calls back when the user skips or stops', () => {
    panel.show({ stepNumber: 1, total: 2, text: 'Click Save changes' })
    button('skip').click()
    button('stop').click()
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('accepts clicks even though the rest of the overlay does not', () => {
    const css = overlay.root.textContent ?? ''
    expect(css).toContain('pointer-events: auto')
  })

  it('hides on request', () => {
    panel.show({ stepNumber: 1, total: 2, text: 'Click Save changes' })
    panel.hide()
    expect(panelElement()?.style.display).toBe('none')
  })

  it('removes itself on destroy', () => {
    panel.destroy()
    expect(panelElement()).toBeNull()
  })

  it('shows a step button only when the step asks for one', () => {
    panel.show({ stepNumber: 1, total: 2, text: 'Read this', primary: 'Got it' })
    expect(button('primary').style.display).not.toBe('none')
    expect(button('primary').textContent).toBe('Got it')

    panel.show({ stepNumber: 2, total: 2, text: 'Click Save changes' })
    expect(button('primary').style.display).toBe('none')
  })

  it('calls back when the user presses that button', () => {
    panel.show({ stepNumber: 1, total: 1, text: 'Read this', primary: 'Got it' })
    button('primary').click()
    expect(onPrimary).toHaveBeenCalledTimes(1)
  })
})
