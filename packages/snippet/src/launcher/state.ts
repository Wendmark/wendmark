import type { FlowSummary } from '../portal/client'

/**
 * What the launcher shows, and in what order.
 *
 * Pure: given the processes an app publishes, where the user is, and what
 * they have done before, decide the sections. Kept apart from the panel so
 * the rules can be read and tested without a DOM.
 */

/** Processes the user finished, remembered in this browser only. */
const COMPLETED_KEY = 'wendmark:completed'

export interface LauncherSections {
  /** The process the user was partway through, if any. */
  unfinished: FlowSummary | null
  /** Processes that belong on this page. */
  here: FlowSummary[]
  /** Everything else this app publishes. */
  elsewhere: FlowSummary[]
}

export interface LauncherInput {
  flows: FlowSummary[]
  /** The process the user left partway through, from saved progress. */
  unfinishedId: string | null
  completedIds: readonly string[]
}

/**
 * Sections, in the order someone would want them.
 *
 * What you were doing comes first, then what you could do here, then the
 * rest. A process that is unfinished is not repeated further down: it is
 * already the most prominent thing on the panel.
 */
export function sectionFlows(input: LauncherInput): LauncherSections {
  const unfinished = input.unfinishedId
    ? (input.flows.find((flow) => flow.id === input.unfinishedId) ?? null)
    : null

  const rest = input.flows.filter((flow) => flow.id !== unfinished?.id)

  return {
    unfinished,
    here: rest.filter((flow) => flow.appliesHere),
    elsewhere: rest.filter((flow) => !flow.appliesHere),
  }
}

/** Whether the launcher has anything at all to show. */
export function isEmpty(sections: LauncherSections): boolean {
  return !sections.unfinished && sections.here.length === 0 && sections.elsewhere.length === 0
}

/**
 * Processes this person has finished before.
 *
 * In the browser, never on the server: which guidance someone needed is
 * their business, and it is not worth a row in anyone's database.
 */
export function loadCompleted(storage: Storage | undefined): string[] {
  try {
    const raw = storage?.getItem(COMPLETED_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Remembers that a process was finished. Failure changes nothing. */
export function markCompleted(storage: Storage | undefined, flowId: string): void {
  try {
    const completed = loadCompleted(storage)
    if (completed.includes(flowId)) return
    // Enough to be useful, not enough to grow without end.
    const next = [...completed, flowId].slice(-50)
    storage?.setItem(COMPLETED_KEY, JSON.stringify(next))
  } catch {
    // No storage, or full: the list is a convenience, not a record.
  }
}
