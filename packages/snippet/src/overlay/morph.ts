/**
 * The grow-and-fold animation shared by the launcher and the recorder.
 *
 * A panel is shown clipped down to its pill, then the clip opens out to the
 * whole panel, so it reads as the pill growing. Folding runs it backwards.
 */

import { PILL_HEIGHT } from '../launcher/pill'

export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
export const GROW_MS = 320
export const FOLD_MS = 240

/** No clip: the whole panel, with its own rounded corners. */
export const OPEN_CLIP = 'inset(0 0 0 0 round 16px)'

/**
 * Whether to animate. Not when the user asked for less motion, and not
 * where the Web Animations API is missing, which also keeps tests in jsdom
 * synchronous.
 */
export function allowsMotion(doc: Document): boolean {
  const view = doc.defaultView
  if (!view || !('animate' in doc.documentElement)) return false
  if (!('matchMedia' in view)) return true
  return !view.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A clip showing only `target`'s rectangle of `panel`, as a pill.
 *
 * Measured rather than assumed, so the panel grows out of wherever the pill
 * really is, even when the panel had to shift to fit on screen.
 */
export function clipTo(panel: HTMLElement, target: DOMRect): string {
  const box = panel.getBoundingClientRect()
  const top = Math.max(target.top - box.top, 0)
  const right = Math.max(box.right - target.right, 0)
  const bottom = Math.max(box.bottom - target.bottom, 0)
  const left = Math.max(target.left - box.left, 0)
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${PILL_HEIGHT / 2}px)`
}
