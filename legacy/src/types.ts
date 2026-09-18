export interface Step {
  /** CSS or shadow-piercing selector for the target element. */
  selector: string
  /** Visible text fallback used when the selector no longer matches. */
  text: string
  /** ARIA role of the target, informational. */
  role?: string
  /** Human instruction shown in the tooltip. */
  instruction: string
  /** Accessible name (aria-label, associated label) — extra anchor. */
  name?: string
  /** Stable class names on the target — extra anchor. */
  classes?: string[]
  /** Nearby section heading / labeled container the target sits in. */
  context?: string
  /** URL the click was recorded on — playback waits for a matching page. */
  url?: string
  /**
   * The target's label is instance data (a vessel, an org, a row), not fixed
   * UI text. Playback highlights all structurally-similar elements and lets
   * the user pick one, instead of text-matching the recorded value.
   */
  dynamic?: boolean
}

export interface Process {
  id: string
  name: string
  steps: Step[]
}

/** Active playback, persisted so guidance survives page navigations. */
export interface PlaybackState {
  process: Process
  stepIndex: number
}
