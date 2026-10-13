import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDraggable } from './drag'

function pointer(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 1, bubbles: true })
}

function setup() {
  const handle = document.createElement('button')
  document.body.appendChild(handle)
  const onClick = vi.fn()
  handle.addEventListener('click', onClick)
  const onMove = vi.fn()
  const onStart = vi.fn()
  const onEnd = vi.fn()
  const undo = makeDraggable(handle, { onMove, onStart, onEnd })
  return { handle, onClick, onMove, onStart, onEnd, undo }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('makeDraggable', () => {
  it('reports how far the handle was dragged', () => {
    const { handle, onMove, onStart, onEnd } = setup()

    handle.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 60, 130))
    handle.dispatchEvent(pointer('pointerup', 60, 130))

    expect(onStart).toHaveBeenCalledOnce()
    expect(onMove).toHaveBeenLastCalledWith(-40, 30)
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('treats a press that barely moves as a click, not a drag', () => {
    const { handle, onMove, onClick } = setup()

    handle.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 102, 101))
    handle.dispatchEvent(pointer('pointerup', 102, 101))
    handle.click()

    expect(onMove).not.toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('swallows the click that follows a drag', () => {
    const { handle, onClick } = setup()

    handle.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 20, 20))
    handle.dispatchEvent(pointer('pointerup', 20, 20))
    handle.click()

    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not swallow a later, real click if the browser sent none after the drag', async () => {
    const { handle, onClick } = setup()

    handle.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 20, 20))
    handle.dispatchEvent(pointer('pointerup', 20, 20))
    await new Promise((resolve) => setTimeout(resolve, 0))
    handle.click()

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('leaves presses on ignored parts alone', () => {
    const handle = document.createElement('div')
    const field = document.createElement('input')
    handle.appendChild(field)
    document.body.appendChild(handle)
    const onMove = vi.fn()
    makeDraggable(handle, { onMove, ignore: (target) => target.tagName === 'INPUT' })

    field.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 20, 20))

    expect(onMove).not.toHaveBeenCalled()
  })

  it('can be undone', () => {
    const { handle, onMove, undo } = setup()
    undo()

    handle.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 20, 20))

    expect(onMove).not.toHaveBeenCalled()
  })
})
