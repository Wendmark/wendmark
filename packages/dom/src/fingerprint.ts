import type { Target } from '@wendmark/core'
import { getContext } from './context'
import { getAccessibleName } from './name'
import { getRole } from './role'
import { buildSelectors, buildShadowPath } from './selectors'
import { getTestId } from './test-id'
import { textWithoutFields, truncate } from './text'

/** The schema's limit for name, text and context. */
const MAX_TEXT = 200

/**
 * Describes an element well enough to find it again later: selectors plus
 * independent clues (role, name, text, test id, context).
 *
 * Only structure and authored labels are read, never what a user typed.
 * Call findInteractiveTarget first to fingerprint the control itself rather
 * than whatever fragment of it was clicked.
 */
export function fingerprint(element: Element): Target {
  const target: Target = { selectors: buildSelectors(element) }

  const shadowPath = buildShadowPath(element)
  if (shadowPath.length >= 2) target.shadowPath = shadowPath

  const testId = getTestId(element)
  if (testId) target.testId = testId.value

  const role = getRole(element)
  if (role) target.role = role

  const name = getAccessibleName(element)
  if (name) target.name = truncate(name, MAX_TEXT)

  const text = textWithoutFields(element)
  if (text) target.text = truncate(text, MAX_TEXT)

  const context = getContext(element)
  if (context) target.context = context

  return target
}
