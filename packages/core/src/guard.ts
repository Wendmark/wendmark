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

/** Whether a value has the shape of a flow this version can play. */
export function looksLikeFlow(value: unknown): value is Flow {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== SCHEMA_VERSION) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false
  return Array.isArray(value.steps) && value.steps.length > 0 && value.steps.every(looksLikeStep)
}
