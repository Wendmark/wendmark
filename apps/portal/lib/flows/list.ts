import type { FlowStatus } from '../../generated/prisma/client'

/**
 * Small decisions about a list of processes, kept away from the database and
 * the page so they can be read and tested on their own.
 */

/**
 * How many steps a stored flow has.
 *
 * The column is JSON, so a row written by an older portal — or by hand —
 * might not hold an array at all. A list should still render.
 */
export function stepCount(steps: unknown): number {
  return Array.isArray(steps) ? steps.length : 0
}

/** Whether a process is currently being shown to users. */
export function isLive(status: FlowStatus): boolean {
  return status === 'published'
}

/** Pausing only means something for a process users can currently see. */
export function canPause(status: FlowStatus): boolean {
  return status === 'published'
}

/** Resuming is for a process that was paused, not one never published. */
export function canResume(status: FlowStatus): boolean {
  return status === 'paused'
}

/** What the status means, in the words a product owner would use. */
export function describeStatus(status: FlowStatus): string {
  if (status === 'published') return 'Users can see this'
  if (status === 'paused') return 'Hidden from users'
  return 'Not published yet'
}

/**
 * A name for a copy that is not already taken.
 *
 * "Order coffee" becomes "Order coffee (copy)", then "(copy 2)". Names are
 * not unique in the database; this is so a list of copies stays readable.
 */
export function copyName(name: string, existing: readonly string[]): string {
  const taken = new Set(existing)
  const first = `${name} (copy)`
  if (!taken.has(first)) return first

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${name} (copy ${n})`
    if (!taken.has(candidate)) return candidate
  }
  return first
}
