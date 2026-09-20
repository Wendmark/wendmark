/**
 * @wendmark/snippet — the script customers embed. Bundled to a single IIFE
 * exposing one global, `window.Wendmark`. Depends on @wendmark/core and
 * @wendmark/dom only.
 *
 * Wendmark guides; it never acts. Nothing here clicks, types or navigates
 * for the user.
 */
import type { Flow } from '@wendmark/core'
// Imported from its own entry point: pulling it from the package root would
// bundle zod (about 95 KB gzipped) into the snippet.
import { looksLikeFlow } from '@wendmark/core/guard'
import { startFlow, type Player } from './player/player'

export type { Flow }
export { createHighlighter, type Highlighter } from './overlay/highlighter'
export { OVERLAY_TAG } from './overlay/overlay'
export { prefersReducedMotion } from './overlay/cursor'

// Handy while authoring flows by hand, before the recorder exists.
export { fingerprint, findInteractiveTarget, resolve } from '@wendmark/dom'

export const version = '0.0.0'

/** Only one flow is guided at a time. */
let current: Player | null = null

/** Starts guiding the user through a flow. Replaces any flow already running. */
export function start(flow: Flow): Player {
  if (!looksLikeFlow(flow)) {
    throw new Error('Wendmark: this flow does not have the shape of a playable flow.')
  }

  stop()
  current = startFlow(flow, {
    onFinish: () => {
      current = null
    },
    onStop: () => {
      current = null
    },
  })
  return current
}

/** Stops the flow being guided, if any. */
export function stop(): void {
  const player = current
  current = null
  player?.stop()
}
