import { StepSchema, type Step } from '@wendmark/core'

/**
 * How a stored report reads in the portal.
 *
 * Pure functions over what is in the row, so the pages stay arrangement and
 * this stays testable without a database.
 */

/** One step as the report page lists it. */
export interface StepView {
  /** What the step says, in the recorder's voice: "Press a button". */
  text: string
  /** What kind of control it was, when there was one. */
  role: string | null
  /** The page it happened on, as a path. */
  page: string | null
  /** Whether it pointed into the user's own data, a row in a list. */
  ownData: boolean
  /** How the player finds the control again. */
  selectors: string[]
}

/**
 * The steps in a row, read defensively.
 *
 * They were validated with `ReportSchema` on the way in, but the column is
 * JSON and a future format could change; a step this portal cannot read is
 * shown as such rather than taking the page down.
 */
export function readSteps(raw: unknown): (Step | null)[] {
  if (!Array.isArray(raw)) return []
  return raw.map((candidate) => {
    const parsed = StepSchema.safeParse(candidate)
    return parsed.success ? parsed.data : null
  })
}

export function viewStep(step: Step | null): StepView {
  if (!step) {
    return {
      text: 'A step this portal cannot read',
      role: null,
      page: null,
      ownData: false,
      selectors: [],
    }
  }
  if (step.type === 'instruction') {
    return { text: step.text, role: null, page: null, ownData: false, selectors: [] }
  }
  return {
    text: step.text,
    role: step.target.role ?? null,
    page: step.target.url ?? null,
    ownData: step.type === 'action' && step.dynamic,
    selectors: step.target.selectors,
  }
}

/** The pages in the order they were visited: "/ → /subscription". */
export function pageTrail(pages: readonly string[]): string {
  return pages.length === 0 ? '—' : pages.join(' → ')
}

/** The first line of a note, short enough for a list. */
export function headline(note: string, max = 120): string {
  const first = note.trim().split('\n')[0] ?? ''
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first
}

/** What the label policy a report was stored under means, in words. */
export function describeLabels(labels: string): string {
  return labels === 'all'
    ? 'Labels kept: the words on the page were stored as they were.'
    : 'Structure only: the words on the page were taken out before it was stored.'
}

/** Where a replay opens the app. */
export interface ReplayStart {
  /** Addresses to offer, the one the report came from first. */
  origins: string[]
  /** The page to open on. */
  path: string
}

/**
 * Where to replay a report: the address it was sent from, when that is
 * still one of the app's, and the first page the person was on.
 *
 * A page whose identifier was masked (`/orders/*`) cannot be opened as it
 * stands, so the replay starts at the root instead and the guide says which
 * page each step is on, as any guide does.
 */
export function replayStart(
  report: { origin: string; pages: readonly string[] },
  appOrigins: readonly string[],
): ReplayStart {
  const origins = appOrigins.includes(report.origin)
    ? [report.origin, ...appOrigins.filter((origin) => origin !== report.origin)]
    : [...appOrigins]

  const first = report.pages[0] ?? '/'
  const path = first.startsWith('/') && !first.split('/').includes('*') ? first : '/'

  return { origins, path }
}
