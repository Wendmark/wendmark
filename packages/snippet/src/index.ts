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
import { clearProgress, loadProgress } from './player/progress'

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

/**
 * Picks a flow up where the user left off, after a page load. The app passes
 * the flows it knows about; only the flow's id and the step number are
 * remembered between pages.
 */
export function resume(flows: Flow | Flow[]): Player | null {
  const storage = safeSessionStorage()
  const progress = loadProgress(storage)
  if (!progress) return null

  const available = Array.isArray(flows) ? flows : [flows]
  const flow = available.find((candidate) => candidate.id === progress.flowId)

  // The flow is gone, or has been edited since: forget it rather than
  // guessing which step the user meant.
  if (!flow || !looksLikeFlow(flow) || progress.stepIndex >= flow.steps.length) {
    clearProgress(storage)
    return null
  }

  stop()
  current = startFlow(flow, {
    startIndex: progress.stepIndex,
    onFinish: () => {
      current = null
    },
    onStop: () => {
      current = null
    },
  })
  return current
}

/** Stops the flow being guided, if any. Keeps progress only when asked. */
export function stop(options: { keepProgress?: boolean } = {}): void {
  const player = current
  current = null
  player?.stop(options)
}

/** The page's session storage, or undefined where the browser refuses it. */
function safeSessionStorage(): Storage | undefined {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}
