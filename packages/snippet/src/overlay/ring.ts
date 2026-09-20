/** Space between the target's edge and the ring, in pixels. */
export const RING_PADDING = 5

const RING_CSS = `
  [data-wendmark="ring"] {
    position: fixed;
    border: 2px solid #7b6cf6;
    border-radius: 10px;
    pointer-events: none;
    box-shadow:
      0 0 0 4px rgba(123, 108, 246, 0.22),
      0 0 20px rgba(123, 108, 246, 0.45);
    transition:
      top 0.12s ease,
      left 0.12s ease,
      width 0.12s ease,
      height 0.12s ease;
  }
`

/** A highlight ring that can be shown around an element and kept on it. */
export interface Ring {
  show: (element: Element) => void
  update: () => void
  hide: () => void
  destroy: () => void
}

/** Creates the highlight ring inside an overlay's shadow root. */
export function createRing(root: ShadowRoot, doc: Document): Ring {
  const style = doc.createElement('style')
  style.textContent = RING_CSS
  root.appendChild(style)

  const box = doc.createElement('div')
  box.dataset.wendmark = 'ring'
  box.style.display = 'none'
  root.appendChild(box)

  let target: Element | null = null

  function hide(): void {
    target = null
    box.style.display = 'none'
  }

  function update(): void {
    if (!target || !target.isConnected) {
      hide()
      return
    }
    const rect = target.getBoundingClientRect()
    box.style.left = `${rect.left - RING_PADDING}px`
    box.style.top = `${rect.top - RING_PADDING}px`
    box.style.width = `${rect.width + RING_PADDING * 2}px`
    box.style.height = `${rect.height + RING_PADDING * 2}px`
    box.style.display = 'block'
  }

  return {
    show: (element: Element) => {
      target = element
      update()
    },
    update,
    hide,
    destroy: () => {
      box.remove()
      style.remove()
    },
  }
}
