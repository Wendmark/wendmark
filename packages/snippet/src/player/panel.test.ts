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
  localStorage.clear()
})

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true })
}

function el<T extends Element>(selector: string): T {
  const found = overlay.root.querySelector<T>(selector)
  if (!found) throw new Error(`no ${selector}`)
  return found
}

function panelElement(): HTMLElement | null {
  return overlay.root.querySelector('[data-wendmark="panel"]')
}

function partText(part: string): string {
  return overlay.root.querySelector(`[data-wendmark="${part}"]`)?.textContent ?? ''
}

/** What the step list reads, in order. */
function stepLabels(): string[] {
  return [...overlay.root.querySelectorAll('[data-wendmark="steps"] li')].map(
    (item) => item.lastElementChild?.textContent ?? '',
  )
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

  it('shows how far along we are, and the whole process', () => {
    panel.show({ stepNumber: 2, total: 3, steps: ['Open the cart', 'Pick a coffee', 'Pay'] })

    expect(panelElement()?.style.display).not.toBe('none')
    expect(partText('progress')).toBe('2 / 3')
    expect(stepLabels()).toEqual(['Open the cart', 'Pick a coffee', 'Pay'])
  })

  it('marks what is done, what is in hand, and what is still to come', () => {
    panel.show({ stepNumber: 2, total: 3, steps: ['Open the cart', 'Pick a coffee', 'Pay'] })
    const items = [...overlay.root.querySelectorAll('[data-wendmark="steps"] li')]

    expect(items[0]?.className).toBe('is-done')
    expect(items[1]?.className).toBe('is-current')
    expect(items[2]?.className).toBe('')
  })

  it('tells a screen reader which step is in hand', () => {
    panel.show({ stepNumber: 3, total: 3, steps: ['One', 'Two', 'Three'] })
    const current = overlay.root.querySelector('[aria-current="step"]')

    expect(current?.textContent).toContain('Three')
  })

  it('ticks off the steps behind the user', () => {
    panel.show({ stepNumber: 3, total: 3, steps: ['One', 'Two', 'Three'] })
    const markers = [...overlay.root.querySelectorAll('[data-wendmark="steps"] .marker')]

    expect(markers.map((m) => m.textContent)).toEqual(['✓', '✓', '3'])
  })

  it('moves the mark along when the step changes', () => {
    const steps = ['Go to Profile', 'Click the address field', 'Save']
    panel.show({ stepNumber: 1, total: 3, steps })
    panel.show({ stepNumber: 2, total: 3, steps })

    expect(partText('progress')).toBe('2 / 3')
    expect(overlay.root.querySelector('[aria-current="step"]')?.textContent).toContain(
      'Click the address field',
    )
  })

  it('leaves nothing behind from the process before', () => {
    panel.show({ stepNumber: 1, total: 3, steps: ['One', 'Two', 'Three'] })
    panel.show({ stepNumber: 1, total: 1, steps: ['Only this'] })

    expect(stepLabels()).toEqual(['Only this'])
  })

  it('treats step text as text, never as markup', () => {
    panel.show({ stepNumber: 1, total: 1, steps: ['<img src=x onerror="alert(1)">'] })

    expect(overlay.root.querySelector('img')).toBeNull()
    expect(stepLabels()).toEqual(['<img src=x onerror="alert(1)">'])
  })

  it('can say something instead of a step, while looking for one', () => {
    panel.show({ stepNumber: 1, total: 4, steps: ['Click Save changes'] })
    panel.setStatus('Looking for this step…')
    expect(partText('status')).toBe('Looking for this step…')
  })

  it('clears its status when the step moves on', () => {
    panel.show({ stepNumber: 1, total: 4, steps: ['One'] })
    panel.setStatus('Looking for this step…')
    panel.show({ stepNumber: 2, total: 4, steps: ['Two'] })
    expect(partText('status')).toBe('')
  })

  it('calls back when the user skips or stops', () => {
    panel.show({ stepNumber: 1, total: 2, steps: ['Click Save changes'] })
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
    panel.show({ stepNumber: 1, total: 2, steps: ['Click Save changes'] })
    panel.hide()
    expect(panelElement()?.style.display).toBe('none')
  })

  it('removes itself on destroy', () => {
    panel.destroy()
    expect(panelElement()).toBeNull()
  })

  it('shows a step button only when the step asks for one', () => {
    panel.show({ stepNumber: 1, total: 2, steps: ['Read this'], primary: 'Got it' })
    expect(button('primary').style.display).not.toBe('none')
    expect(button('primary').textContent).toBe('Got it')

    panel.show({ stepNumber: 2, total: 2, steps: ['Click Save changes'] })
    expect(button('primary').style.display).toBe('none')
  })

  it('calls back when the user presses that button', () => {
    panel.show({ stepNumber: 1, total: 1, steps: ['Read this'], primary: 'Got it' })
    button('primary').click()
    expect(onPrimary).toHaveBeenCalledTimes(1)
  })

  it('can be closed with its ✕, which stops the guide', () => {
    panel.show({ stepNumber: 1, total: 2, steps: ['Open the cart', 'Pay'] })
    expect(button('stop').getAttribute('aria-label')).toBe('Stop this guide')
    button('stop').click()
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('folds into a pill that still says which step the user is on', () => {
    panel.show({ stepNumber: 2, total: 3, steps: ['Open the cart', 'Pick a coffee', 'Pay'] })
    const bar = el<HTMLButtonElement>('.wm-bar')

    expect(el('.wm-bar .label').textContent).toBe('2/3 · Pick a coffee')
    expect([...el('.wm-bar .pill').children].map((c) => c.getAttribute('class'))).toEqual([
      'mark',
      'label',
      'chevron',
    ])

    bar.click()
    expect(panelElement()?.classList.contains('is-folded')).toBe(true)
    expect(bar.getAttribute('aria-expanded')).toBe('false')

    // Guidance carries on while folded: the pill follows along.
    panel.show({ stepNumber: 3, total: 3, steps: ['Open the cart', 'Pick a coffee', 'Pay'] })
    expect(el('.wm-bar .label').textContent).toBe('3/3 · Pay')

    bar.click()
    expect(panelElement()?.classList.contains('is-folded')).toBe(false)
  })

  it('starts in the bottom-right corner, and can be dragged by its header', () => {
    panel.show({ stepNumber: 1, total: 2, steps: ['Open the cart', 'Pay'] })
    const frame = el<HTMLElement>('.wm-frame')
    expect(frame.style.right).toBe('16px')

    const header = el<HTMLElement>('[data-wendmark="panel"] header')
    header.dispatchEvent(pointer('pointerdown', 900, 500))
    header.dispatchEvent(pointer('pointermove', 700, 400))
    header.dispatchEvent(pointer('pointerup', 700, 400))

    expect(frame.style.right).toBe('216px')
    expect(frame.style.bottom).toBe('116px')
    expect(localStorage.getItem('wendmark:guide-position')).not.toBeNull()
  })

  it('is not dragged when its buttons are pressed', () => {
    panel.show({ stepNumber: 1, total: 2, steps: ['Open the cart', 'Pay'] })
    button('stop').dispatchEvent(pointer('pointerdown', 900, 500))
    el('[data-wendmark="panel"] header').dispatchEvent(pointer('pointermove', 700, 400))
    expect(el<HTMLElement>('.wm-frame').style.right).toBe('16px')
  })
})
