/**
 * @wendmark/snippet — the script customers embed. Bundled to a single IIFE
 * exposing one global, `window.Wendmark`. Will host the player, recorder and
 * guidance UI (inside a shadow root). Depends on @wendmark/core and
 * @wendmark/dom only.
 *
 * Placeholder: no player, recorder or UI yet.
 */
import type { Flow } from '@wendmark/core'
import { DOM_PACKAGE } from '@wendmark/dom'

export type { Flow }

export const version = '0.0.0'

/** Placeholder so the dependency on @wendmark/dom is exercised by the build. */
export const packages = ['@wendmark/snippet', DOM_PACKAGE] as const
