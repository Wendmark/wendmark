/** Where a user had got to in a flow, so a page load can pick it up again. */
export interface SavedProgress {
  flowId: string
  stepIndex: number
}

/** The single key Wendmark keeps in the page's session storage. */
export const PROGRESS_KEY = 'wendmark:progress'

/** Whether a value read back from storage is progress we can act on. */
function isProgress(value: unknown): value is SavedProgress {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.flowId === 'string' &&
    candidate.flowId !== '' &&
    typeof candidate.stepIndex === 'number' &&
    Number.isInteger(candidate.stepIndex) &&
    candidate.stepIndex >= 0
  )
}

/** Remembers where the user is, if the browser lets us. */
export function saveProgress(storage: Storage | undefined, progress: SavedProgress): void {
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Private mode, blocked storage, full quota: guidance still works, it
    // just will not survive a reload. Never break the page over this.
  }
}

/** Reads back saved progress, or null when there is none we can trust. */
export function loadProgress(storage: Storage | undefined): SavedProgress | null {
  try {
    const raw = storage?.getItem(PROGRESS_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isProgress(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Forgets any saved progress. */
export function clearProgress(storage: Storage | undefined): void {
  try {
    storage?.removeItem(PROGRESS_KEY)
  } catch {
    // Nothing to do: the flow is over either way.
  }
}
