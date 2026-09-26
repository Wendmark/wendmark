/**
 * Publishing, as a decision rather than a database write.
 *
 * Publishing takes a copy of the flow as it stands and freezes it. Users are
 * served that copy, never the row the author is editing, so an edit in
 * progress can never reach someone mid-process. See
 * docs/decisions/flow-compatibility.md for the format rules those copies
 * follow.
 */

/** What is frozen when a flow is published. */
export interface Snapshot {
  name: string
  description: string | null
  steps: unknown
  schemaVersion: number
  urlPatterns: string[]
}

/** The number the next published version gets. Versions never reuse a number. */
export function nextVersion(published: readonly { version: number }[]): number {
  return published.reduce((highest, one) => Math.max(highest, one.version), 0) + 1
}

/**
 * Whether the draft says something different from what users are being
 * served.
 *
 * Compared by value, because that is the question the author is asking:
 * "does anything I have changed still need publishing?" A flow that was
 * edited and edited back needs no publish.
 */
export function hasUnpublishedChanges(draft: Snapshot, published: Snapshot | null): boolean {
  if (!published) return true

  return (
    draft.name !== published.name ||
    draft.description !== published.description ||
    draft.schemaVersion !== published.schemaVersion ||
    !sameStrings(draft.urlPatterns, published.urlPatterns) ||
    JSON.stringify(draft.steps) !== JSON.stringify(published.steps)
  )
}

/** Same values in the same order. */
function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/** What the author should be told about a flow's publishing state. */
export type PublishState = 'never-published' | 'up-to-date' | 'edited-since'

export function publishState(hasVersions: boolean, changed: boolean): PublishState {
  if (!hasVersions) return 'never-published'
  return changed ? 'edited-since' : 'up-to-date'
}

/** That state in the words an author would use. */
export function describePublishState(state: PublishState): string {
  if (state === 'never-published') return 'Never published'
  if (state === 'edited-since')
    return 'Edited since it was published — users still see the old version'
  return 'Users see the latest version'
}
