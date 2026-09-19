/**
 * @wendmark/dom — element fingerprints and the resolver that finds an
 * element again from its fingerprint. Depends on @wendmark/core only.
 *
 * Fingerprint capture and resolution are not implemented yet.
 */
import type { Target } from '@wendmark/core'

export type { Target }

export { getAccessibleName } from './name'
export { getRole } from './role'

export const DOM_PACKAGE = '@wendmark/dom'
