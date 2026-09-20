/**
 * @wendmark/dom — describing an element well enough to find it again, and
 * finding it again on a page that has since changed.
 * Depends on @wendmark/core only.
 */
export type { Target } from '@wendmark/core'

export { fingerprint } from './fingerprint'
export { findInteractiveTarget, isInteractive } from './interactive'
export { getAccessibleName } from './name'
export { getRole } from './role'
export { resolve, type Resolution } from './resolve'
export { isProbablyVisible } from './visible'

export const DOM_PACKAGE = '@wendmark/dom'
