import type { Flow, Step } from '@wendmark/core'
import { SCHEMA_VERSION } from '@wendmark/core/guard'
import type { AuthorContext } from './loader'

/**
 * Replaying a problem report, here in the app it came from.
 *
 * The portal approved this page to read one report. Its steps are played
 * with the ordinary player and teaching cursor: whoever is replaying does
 * each step themselves, and Wendmark points, as it always does. Only people
 * sent from the portal ever load this; it lives in author.js for that
 * reason.
 */

/** What the portal sends back for a replay session. */
export interface ReplayReport {
  id: string
  note: string
  steps: Step[]
}

/** Long enough to recognise the report, short enough for the panel. */
const NOTE_LENGTH = 160

/** Fetches the report this session may read. Null when it cannot. */
export async function fetchReplay(
  portalOrigin: string,
  sessionToken: string,
): Promise<ReplayReport | null> {
  try {
    const response = await fetch(`${portalOrigin}/api/v1/author/replay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
      mode: 'cors',
      credentials: 'omit',
    })
    if (response.status !== 200) return null

    const data = (await response.json()) as Partial<ReplayReport> | null
    if (typeof data?.id !== 'string' || !Array.isArray(data.steps)) return null
    return { id: data.id, note: typeof data.note === 'string' ? data.note : '', steps: data.steps }
  } catch {
    return null
  }
}

/** The note's first line, shortened for the panel. */
function shortNote(note: string): string {
  const first = note.trim().split('\n')[0] ?? ''
  return first.length > NOTE_LENGTH ? `${first.slice(0, NOTE_LENGTH - 1).trimEnd()}…` : first
}

/**
 * The report as a flow the player can guide.
 *
 * It opens with a step that says what this is. A replay shows what somebody
 * did, which may well be the wrong way to do it; nobody should take it for
 * a guide to follow.
 */
export function replayFlow(report: ReplayReport): Flow {
  const note = shortNote(report.note)
  const intro: Step = {
    type: 'instruction',
    id: 'wendmark-replay-intro',
    text:
      'Replaying a problem report: these are the steps they took, not necessarily the right ones. ' +
      'Do each one yourself and Wendmark will point the way.' +
      (note ? ` They wrote: “${note}”` : ''),
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id: `report-${report.id}`,
    name: 'Problem report',
    steps: [intro, ...report.steps],
  }
}

/** Said instead, when the report cannot be read. */
function failureFlow(): Flow {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'report-unavailable',
    name: 'Problem report',
    steps: [
      {
        type: 'instruction',
        id: 'wendmark-replay-failed',
        text: 'This report could not be loaded here. Start the replay again from the report in the portal.',
      },
    ],
  }
}

/** Fetches the report and plays it. */
export async function replay(context: AuthorContext): Promise<void> {
  const report = await fetchReplay(context.portalOrigin, context.session.sessionToken)
  const flow = report && report.steps.length > 0 ? replayFlow(report) : failureFlow()

  // Nothing to remember between pages: the portal serves flows by id to
  // anyone with the app's key, and a report is not one of them.
  try {
    context.api.startFlow(flow, { remember: false })
  } catch {
    // A report whose steps this snippet cannot play: say so rather than
    // leaving the person wondering why nothing happened.
    context.api.startFlow(failureFlow(), { remember: false })
  }
}
