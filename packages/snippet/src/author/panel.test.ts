import type { Step } from '@wendmark/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOverlay, type Overlay } from '../overlay/overlay'
import { createRecorderPanel, type PanelHandlers, type PanelState } from './panel'

let overlay: Overlay | null = null

function step(n: number): Step {
  return {
    type: 'action',
    id: `s${n}`,
    text: `Click button ${n}`,
    dynamic: false,
    target: { selectors: [`#b${n}`], role: 'button', name: `Button ${n}` },
  }
}

function state(steps: number, extra: Partial<PanelState> = {}): PanelState {
  return {
    draft: { name: 'Buy a coffee', steps: Array.from({ length: steps }, (_, i) => step(i + 1)) },
    paused: false,
    saving: false,
    message: null,
    ...extra,
  }
}

function setup(steps = 0) {
  overlay = createOverlay(document)
  const handlers: PanelHandlers = {
    onRename: vi.fn(),
    onRetitle: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onToggleDynamic: vi.fn(),
    onAddNote: vi.fn(),
    onTogglePause: vi.fn(),
    onTest: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  }
  const panel = createRecorderPanel(overlay.root, document, handlers)
  panel.render(state(steps))
  const root = overlay.root
  const get = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector)
    if (!element) throw new Error(`No ${selector}`)
    return element
  }
  return { root, panel, handlers, get }
}

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true })
}

afterEach(() => {
  overlay?.destroy()
  overlay = null
  localStorage.clear()
})

describe('the recorder panel', () => {
  it('carries the Wendmark mark and a recording light in its bar', () => {
    const { get } = setup()
    const parts = [...get('.wm-bar .pill').children].map((child) => child.getAttribute('class'))
    expect(parts).toEqual(['mark', 'rec-dot', 'label', 'chevron'])
  })

  it('says how many steps it has recorded, and when it is paused', () => {
    const { panel, get } = setup(3)
    expect(get('.wm-bar .label').textContent).toBe('Recording · 3 steps')

    panel.render(state(1, { paused: true }))
    expect(get('.wm-bar .label').textContent).toBe('Paused · 1 step')
    expect(get('.rec-dot').classList.contains('is-paused')).toBe(true)
  })

  it('starts in the bottom-right corner', () => {
    const { get } = setup()
    const frame = get<HTMLElement>('.wm-frame')
    expect(frame.style.right).toBe('16px')
    expect(frame.style.bottom).toBe('16px')
  })

  it('folds into its pill and back when the bar is pressed', () => {
    const { get } = setup(2)
    const panel = get('[data-wendmark="recorder"]')
    const bar = get<HTMLButtonElement>('.wm-bar')

    bar.click()
    expect(panel.classList.contains('is-folded')).toBe(true)
    expect(bar.getAttribute('aria-expanded')).toBe('false')

    bar.click()
    expect(panel.classList.contains('is-folded')).toBe(false)
    expect(bar.getAttribute('aria-expanded')).toBe('true')
  })

  it('asks before throwing away recorded steps', () => {
    const { get, handlers } = setup(4)

    get<HTMLButtonElement>('.discard').click()
    const confirm = get<HTMLElement>('.confirm')

    expect(handlers.onCancel).not.toHaveBeenCalled()
    expect(confirm.hidden).toBe(false)
    expect(confirm.textContent).toContain('Discard 4 recorded steps?')
  })

  it('keeps recording when the author changes their mind', () => {
    const { get, handlers } = setup(2)

    get<HTMLButtonElement>('.discard').click()
    get<HTMLButtonElement>('.confirm .keep').click()

    expect(get<HTMLElement>('.confirm').hidden).toBe(true)
    expect(handlers.onCancel).not.toHaveBeenCalled()
  })

  it('discards once confirmed', () => {
    const { get, handlers } = setup(2)

    get<HTMLButtonElement>('.discard').click()
    get<HTMLButtonElement>('.confirm .danger').click()

    expect(handlers.onCancel).toHaveBeenCalledOnce()
  })

  it('does not ask when there is nothing to lose', () => {
    const { get, handlers } = setup(0)
    get<HTMLButtonElement>('.discard').click()
    expect(handlers.onCancel).toHaveBeenCalledOnce()
  })

  it('can be dragged by its header, and remembers where it was put', () => {
    const { get } = setup(1)
    const header = get<HTMLElement>('header')
    const frame = get<HTMLElement>('.wm-frame')

    header.dispatchEvent(pointer('pointerdown', 900, 300))
    header.dispatchEvent(pointer('pointermove', 600, 200))
    header.dispatchEvent(pointer('pointerup', 600, 200))

    expect(frame.style.right).toBe('316px')
    expect(frame.style.bottom).toBe('116px')
    expect(JSON.parse(localStorage.getItem('wendmark:recorder-position') ?? '{}')).toEqual({
      right: 316,
      bottom: 116,
    })
  })

  it('is not dragged from its name field, so the name can still be edited', () => {
    const { get } = setup(1)
    const frame = get<HTMLElement>('.wm-frame')
    const name = get<HTMLInputElement>('input[data-wendmark="flow-name"]')

    name.dispatchEvent(pointer('pointerdown', 900, 300))
    get('header').dispatchEvent(pointer('pointermove', 600, 200))

    expect(frame.style.right).toBe('16px')
  })

  it('a drag on the bar moves it without folding it', () => {
    const { get } = setup(1)
    const bar = get<HTMLButtonElement>('.wm-bar')

    bar.dispatchEvent(pointer('pointerdown', 900, 700))
    bar.dispatchEvent(pointer('pointermove', 800, 650))
    bar.dispatchEvent(pointer('pointerup', 800, 650))
    bar.click()

    expect(get('[data-wendmark="recorder"]').classList.contains('is-folded')).toBe(false)
    expect(get<HTMLElement>('.wm-frame').style.right).toBe('116px')
  })

  it('leaves nothing behind', () => {
    const { panel, root } = setup(1)
    panel.destroy()
    expect(root.querySelector('.wm-frame')).toBeNull()
  })
})
