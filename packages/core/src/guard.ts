/**
 * A cheap, dependency-free check that a value looks like a Flow.
 *
 * The zod schemas are the source of truth, but they carry zod with them,
 * which is far too heavy for the snippet's size budget. The snippet uses
 * this guard at runtime; the portal validates properly with FlowSchema
 * before a flow is ever stored or served.
 */
import type { Flow, Step } from './schemas'
import { SCHEMA_VERSION } from './version'

// Re-exported so the snippet can tell the portal which format it speaks
// without importing the package root, which would bundle zod.
export { SCHEMA_VERSION }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function looksLikeStep(value: unknown): value is Step {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.text)) return false

  if (value.type === 'instruction') return true

  if (value.type === 'action' || value.type === 'input') {
    const target = value.target
    if (!isRecord(target)) return false
    return Array.isArray(target.selectors) && target.selectors.every(isNonEmptyString)
  }
  return false
}

/**
 * Why a flow cannot be played, when it cannot.
 *
 * "too-new" is worth telling apart from "malformed": one means the person
 * running this page has an old copy of the snippet, which a reload fixes,
 * and the other means the flow is wrong. See
 * docs/decisions/flow-compatibility.md.
 */
export type FlowVerdict = 'ok' | 'too-new' | 'malformed'

export function checkFlow(value: unknown): FlowVerdict {
  if (!isRecord(value)) return 'malformed'

  const version = value.schemaVersion
  if (typeof version === 'number' && version > SCHEMA_VERSION) return 'too-new'
  if (version !== SCHEMA_VERSION) return 'malformed'

  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return 'malformed'
  if (!Array.isArray(value.steps) || value.steps.length === 0) return 'malformed'

  // An unknown step type means a flow written by a newer Wendmark, even when
  // the version says otherwise: step types are added without a version bump
  // while nothing is published.
  if (value.steps.some(isUnknownStepType)) return 'too-new'
  return value.steps.every(looksLikeStep) ? 'ok' : 'malformed'
}

/** Whether a value has the shape of a flow this version can play. */
export function looksLikeFlow(value: unknown): value is Flow {
  return checkFlow(value) === 'ok'
}

const KNOWN_TYPES = ['action', 'input', 'instruction']

/** A step whose type this build has never heard of. */
function isUnknownStepType(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.type) && !KNOWN_TYPES.includes(value.type)
}
