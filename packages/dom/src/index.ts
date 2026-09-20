/**
 * @wendmark/dom — element fingerprints and the resolver that finds an
 * element again from its fingerprint. Depends on @wendmark/core only.
 *
 * Resolution is not implemented yet.
 */
import type { Target } from '@wendmark/core'

export type { Target }

export { fingerprint } from './fingerprint'
export { findInteractiveTarget, isInteractive } from './interactive'
export { getAccessibleName } from './name'
export { getRole } from './role'

export const DOM_PACKAGE = '@wendmark/dom'
