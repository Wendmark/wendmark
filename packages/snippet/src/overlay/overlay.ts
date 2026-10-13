import { WENDMARK_HOST_TAG } from '@wendmark/dom'

/**
 * The custom element Wendmark's guidance UI lives in. Defined in the element
 * engine, which must never search inside it.
 */
export const OVERLAY_TAG = WENDMARK_HOST_TAG

/** Above every sane z-index, so guidance is never hidden by the page. */
const TOP_LAYER = '2147483647'

/**
 * Styles for everything inside the shadow root. `all: initial` cuts off any
 * inheritance from the host page, so their CSS cannot reach our UI.
 */
const BASE_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
`

/** A mounted overlay: a shadow root to draw in, and a way to remove it. */
export interface Overlay {
  root: ShadowRoot
  destroy: () => void
}

/**
 * Creates the one element Wendmark adds to a customer's page: a fixed,
 * click-through host with an open shadow root for our own UI.
 */
export function createOverlay(doc: Document): Overlay {
  const host = doc.createElement(OVERLAY_TAG)
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'inset: 0',
    `z-index: ${TOP_LAYER}`,
    'pointer-events: none',
  ].join('; ')

  const root = host.attachShadow({ mode: 'open' })
  const style = doc.createElement('style')
  style.textContent = BASE_CSS
  root.appendChild(style)

  doc.documentElement.appendChild(host)

  return {
    root,
    destroy: () => host.remove(),
  }
}
