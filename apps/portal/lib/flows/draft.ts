import { FlowSchema, type Flow } from '@wendmark/core'

/**
 * Reading what author mode sends when someone saves a recording.
 *
 * Everything here is untrusted: it arrives from a page we do not control,
 * over CORS, from a browser anyone can open a console in. So the body has a
 * ceiling, the flow goes through the real schema, and the caller decides
 * nothing from the request beyond what is in it.
 */

/** As much as a saved recording may weigh. A long flow is a few KB. */
export const MAX_BODY_BYTES = 128 * 1024

/** More steps than this is a runaway recording, not a process to follow. */
export const MAX_STEPS = 200

export interface DraftRequest {
  sessionToken: string
  flow: Flow
}

export type ReadResult = { ok: true; request: DraftRequest } | { ok: false; error: string }

/** Whether a body is small enough to be worth parsing at all. */
export function isWithinSizeLimit(bytes: number): boolean {
  return bytes <= MAX_BODY_BYTES
}

/**
 * Turns a request body into a draft to save, or an explanation.
 *
 * The message goes back to the person recording, so it says what is wrong
 * with their recording. It never says anything about the session: that
 * refusal is deliberately vague and lives in the route.
 */
export function readDraftRequest(body: unknown): ReadResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'That request was not a recording.' }
  }

  const candidate = body as Record<string, unknown>
  const sessionToken =
    typeof candidate['sessionToken'] === 'string' ? candidate['sessionToken'] : ''
  if (!sessionToken) return { ok: false, error: 'That request was not a recording.' }

  const parsed = FlowSchema.safeParse(candidate['flow'])
  if (!parsed.success) {
    return { ok: false, error: explain(parsed.error.issues) }
  }

  if (parsed.data.steps.length > MAX_STEPS) {
    return { ok: false, error: `A process can have at most ${MAX_STEPS} steps.` }
  }

  return { ok: true, request: { sessionToken, flow: parsed.data } }
}

/** The first problem, in words the author can act on. */
function explain(issues: { path: PropertyKey[]; message: string }[]): string {
  const first = issues[0]
  if (!first) return 'That recording could not be read.'

  const where = first.path.length > 0 ? first.path.join('.') : 'the recording'
  return `${where}: ${first.message}`
}
