import { afterEach, describe, expect, it, vi } from 'vitest'
import { rememberedPosition, type Position } from '../overlay/anchor'
import { createOverlay, type Overlay } from '../overlay/overlay'
import { createOpenerButton } from './button'

let overlay: Overlay | null = null

function render(
  label = 'Show me how',
  onOpen = () => {},
  position: Position = rememberedPosition(undefined, 'unused'),
) {
  overlay = createOverlay(document)
  const opener = createOpenerButton(overlay.root, document, label, onOpen, position)
  const button = overlay.root.querySelector<HTMLButtonElement>('button.opener')
  if (!button) throw new Error('No opener button rendered')
  return { root: overlay.root, opener, button }
}

afterEach(() => {
  overlay?.destroy()
  overlay = null
  localStorage.clear()
})

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true })
}

describe('the opener button', () => {
  it('is named by the label the app chose, and nothing else', () => {
    const { button } = render('How do I…')
    // Whitespace collapsed, the way a browser computes an accessible name.
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe('How do I…')
  })

  it('keeps the label in its own element, so a long one truncates without clipping the icons', () => {
    const { button } = render('A very long label an app might choose')
    expect(button.querySelector('.label')?.textContent).toBe(
      'A very long label an app might choose',
    )
  })

  it('shows the Wendmark mark before the label and a chevron after it', () => {
    const { button } = render()
    const parts = [...button.children].map((child) => child.getAttribute('class'))
    expect(parts).toEqual(['mark', 'label', 'chevron'])
  })

  it('keeps both icons out of the accessibility tree and out of the tab order', () => {
    const { button } = render()
    const icons = [...button.querySelectorAll('svg')]
    expect(icons).toHaveLength(2)
    for (const icon of icons) {
      expect(icon.getAttribute('aria-hidden')).toBe('true')
      expect(icon.getAttribute('focusable')).toBe('false')
    }
  })

  it('says it opens a dialog, and whether it is open', () => {
    const { button, opener } = render()
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    expect(button.getAttribute('aria-expanded')).toBe('false')

    opener.setHidden(true)
    expect(button.style.display).toBe('none')
    expect(button.getAttribute('aria-expanded')).toBe('true')

    opener.setHidden(false)
    expect(button.style.display).toBe('')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('calls back when the user presses it', () => {
    const onOpen = vi.fn()
    const { button } = render('Show me how', onOpen)
    button.click()
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('takes itself and its styles away on destroy', () => {
    const { root, opener } = render()
    opener.destroy()
    expect(root.querySelector('button.opener')).toBeNull()
    expect(
      [...root.querySelectorAll('style')].some((s) => s.textContent?.includes('.opener')),
    ).toBe(false)
  })

  it('starts in the bottom-right corner', () => {
    const { button } = render()
    expect(button.style.right).toBe('16px')
    expect(button.style.bottom).toBe('16px')
  })

  it('can be dragged out of the way, without opening, and remembers where', () => {
    const onOpen = vi.fn()
    const position = rememberedPosition(localStorage, 'wendmark:launcher-position')
    const { button } = render('Show me how', onOpen, position)

    button.dispatchEvent(pointer('pointerdown', 900, 700))
    button.dispatchEvent(pointer('pointermove', 700, 600))
    button.dispatchEvent(pointer('pointerup', 700, 600))
    button.click()

    expect(onOpen).not.toHaveBeenCalled()
    expect(button.style.right).toBe('216px')
    expect(button.style.bottom).toBe('116px')
    expect(JSON.parse(localStorage.getItem('wendmark:launcher-position') ?? '{}')).toEqual({
      right: 216,
      bottom: 116,
    })
  })

  it('comes back where it was left last time', () => {
    localStorage.setItem('wendmark:launcher-position', JSON.stringify({ right: 120, bottom: 80 }))
    const { button } = render(
      'Show me how',
      () => {},
      rememberedPosition(localStorage, 'wendmark:launcher-position'),
    )
    expect(button.style.right).toBe('120px')
    expect(button.style.bottom).toBe('80px')
  })
})
