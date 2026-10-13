import { afterEach, describe, expect, it, vi } from 'vitest'
import { rememberedPosition } from '../overlay/anchor'
import { createOverlay, type Overlay } from '../overlay/overlay'
import type { FlowSummary } from '../portal/client'
import { openLauncher } from './launcher'

function flow(id: string, name: string, appliesHere = true): FlowSummary {
  return { id, name, description: null, steps: 2, appliesHere }
}

let overlay: Overlay | null = null

function open(flows: FlowSummary[], options: Partial<Parameters<typeof openLauncher>[3]> = {}) {
  overlay = createOverlay(document)
  const launcher = openLauncher(overlay.root, document, flows, {
    label: 'How do I…',
    unfinishedId: null,
    completedIds: [],
    onChoose: () => {},
    onClose: () => {},
    position: rememberedPosition(undefined, 'unused'),
    from: null,
    ...options,
  })
  return { root: overlay.root, launcher }
}

function buttons(root: ShadowRoot): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')]
}

afterEach(() => {
  overlay?.destroy()
  overlay = null
  document.body.innerHTML = ''
})

describe('the launcher', () => {
  it('lists what the app publishes', () => {
    const { root } = open([flow('a', 'Order coffee'), flow('b', 'Change your grind')])
    const labels = buttons(root).map((button) => button.textContent)

    expect(labels.some((label) => label?.includes('Order coffee'))).toBe(true)
    expect(labels.some((label) => label?.includes('Change your grind'))).toBe(true)
  })

  it('is a dialog, and says what it is', () => {
    const { root } = open([flow('a', 'Order coffee')])
    const panel = root.querySelector('[role="dialog"]')

    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('aria-label')).toBe('How do I…')
  })

  it('calls itself whatever the app called it', () => {
    const { root } = open([flow('a', 'Order coffee')], { label: 'Guides' })

    expect(root.querySelector('.bar .label')?.textContent).toBe('Guides')
    expect(root.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Guides')
  })

  it('keeps the button inside it: the mark, the label and a chevron, as a bar that says it is open', () => {
    const { root } = open([flow('a', 'Order coffee')], { label: 'Guides' })
    const bar = root.querySelector('.bar')

    expect(bar?.getAttribute('aria-expanded')).toBe('true')
    expect(
      [...(bar?.querySelector('.pill')?.children ?? [])].map((c) => c.getAttribute('class')),
    ).toEqual(['mark', 'label', 'chevron'])
  })

  it('lists the processes first and puts the bar last, where the button was', () => {
    const { root } = open([flow('a', 'Order coffee')])
    const sheet = root.querySelector('.sheet')

    expect(sheet?.firstElementChild?.className).toBe('list')
    expect(sheet?.lastElementChild?.className).toBe('bar')
  })

  it('separates this page from the rest of the app', () => {
    const { root } = open([flow('a', 'Here', true), flow('b', 'Elsewhere', false)])
    const headings = [...root.querySelectorAll('h3')].map((one) => one.textContent)

    expect(headings).toContain('On this page')
    expect(headings).toContain('Elsewhere in this app')
  })

  it('offers to carry on with something left unfinished', () => {
    const { root } = open([flow('a', 'Order coffee')], { unfinishedId: 'a' })

    expect([...root.querySelectorAll('h3')].map((one) => one.textContent)).toContain('Carry on')
    expect(root.querySelector('.resume')?.textContent).toContain('Pick up where you left off')
  })

  it('says when something was done before', () => {
    const { root } = open([flow('a', 'Order coffee')], { completedIds: ['a'] })
    expect(root.querySelector('.done')?.textContent).toContain('Done before')
  })

  it('has something to say when there is nothing to show', () => {
    const { root } = open([])
    expect(root.textContent).toContain('Nothing to show here yet')
  })

  it('reports what the user chose, and closes first', () => {
    const chosen = vi.fn()
    const { root } = open([flow('a', 'Order coffee')], { onChoose: chosen })

    const item = root.querySelector<HTMLButtonElement>('.item')
    item?.click()

    expect(chosen).toHaveBeenCalledWith('a')
    expect(root.querySelector('[role="dialog"]')).toBeNull()
  })

  it('closes on Escape', () => {
    const { root } = open([flow('a', 'Order coffee')])

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(root.querySelector('[role="dialog"]')).toBeNull()
  })

  it('closes from its bar, the button it grew out of', () => {
    const { root } = open([flow('a', 'Order coffee')])

    root.querySelector<HTMLButtonElement>('.bar')?.click()
    expect(root.querySelector('[role="dialog"]')).toBeNull()
  })

  it('tells the app it closed, from its bar or Escape', () => {
    const closed = vi.fn()
    const first = open([flow('a', 'Order coffee')], { onClose: closed })
    first.root.querySelector<HTMLButtonElement>('.bar')?.click()
    expect(closed).toHaveBeenCalledOnce()

    overlay?.destroy()
    open([flow('a', 'Order coffee')], { onClose: closed })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(closed).toHaveBeenCalledTimes(2)
  })

  it('stops listening for keys once closed', () => {
    const { root, launcher } = open([flow('a', 'Order coffee')])
    launcher.close()

    // Would throw if the handler were still attached to a removed panel.
    expect(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
    ).not.toThrow()
    expect(root.querySelector('[role="dialog"]')).toBeNull()
  })

  it('puts focus in the panel, and gives it back on close', () => {
    document.body.innerHTML = '<button id="opener">Help</button>'
    const opener = document.getElementById('opener') as HTMLButtonElement
    opener.focus()

    const { root, launcher } = open([flow('a', 'Order coffee')])
    expect(root.activeElement).not.toBeNull()

    launcher.close()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab inside the panel', () => {
    const { root } = open([flow('a', 'Order coffee')])
    const stops = buttons(root)
    const last = stops[stops.length - 1]
    last?.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(root.activeElement).toBe(stops[0])
  })

  it('leaves the page alone: only its own controls take clicks', () => {
    const { root } = open([flow('a', 'Order coffee')])
    const host = document.querySelector('wendmark-overlay') as HTMLElement

    expect(host.style.pointerEvents).toBe('none')
    expect(getComputedStyle(root.querySelector('.sheet') as Element).pointerEvents).toBe('auto')
  })

  it('moves with its bar, and shares where it is with the button', () => {
    const position = rememberedPosition(undefined, 'unused')
    const { root } = open([flow('a', 'Order coffee')], { position })
    const bar = root.querySelector<HTMLButtonElement>('.bar')
    const frame = root.querySelector<HTMLElement>('.frame')
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true })

    bar?.dispatchEvent(pointer('pointerdown', 900, 700))
    bar?.dispatchEvent(pointer('pointermove', 850, 650))
    bar?.dispatchEvent(pointer('pointerup', 850, 650))
    bar?.click()

    expect(frame?.style.right).toBe('66px')
    expect(position.get()).toEqual({ right: 66, bottom: 66 })
    // A drag is not a press: the panel stays open.
    expect(root.querySelector('[role="dialog"]')).not.toBeNull()
  })
})
