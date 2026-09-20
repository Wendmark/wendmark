/**
 * @wendmark/snippet — the script customers embed. Bundled to a single IIFE
 * exposing one global, `window.Wendmark`. Depends on @wendmark/core and
 * @wendmark/dom only.
 *
 * So far: the overlay and the highlight ring. The cursor, player and
 * recorder come next.
 */
export type { Flow } from '@wendmark/core'

export { createHighlighter, type Highlighter } from './overlay/highlighter'
export { OVERLAY_TAG } from './overlay/overlay'

export const version = '0.0.0'
