/**
 * What the snippet reads about an app on load.
 *
 * Kept in one JSON column rather than a column per switch: these are small,
 * they change as the snippet grows, and none of them is worth a migration.
 * Read defensively — the column may hold anything a previous version wrote.
 */

/** What the launcher calls itself when an app has not said otherwise. */
export const DEFAULT_LAUNCHER_LABEL = 'How do I…'

/** Long enough for a sentence fragment, short enough to stay one line. */
export const MAX_LAUNCHER_LABEL = 40

export interface AppSettings {
  /**
   * Whether the snippet shows its own "How do I…" button.
   *
   * Off unless an app turns it on. Wendmark appears inside someone else's
   * product, and putting a button in their interface uninvited is not our
   * decision to make. An app that would rather place it itself calls
   * `Wendmark.openLauncher()` from its own help menu.
   */
  launcher: boolean
  /**
   * What the button and the panel are called.
   *
   * Wendmark's own wording will not suit every product — "Guides", "Show me
   * how", or something in the app's own language. It is the only English the
   * snippet puts in front of an end user that an app cannot otherwise
   * change.
   */
  launcherLabel: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  launcher: false,
  launcherLabel: DEFAULT_LAUNCHER_LABEL,
}

/** The settings an app has, whatever the column actually holds. */
export function readAppSettings(stored: unknown): AppSettings {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_SETTINGS

  const candidate = stored as Record<string, unknown>
  const label = candidate['launcherLabel']

  return {
    launcher: candidate['launcher'] === true,
    launcherLabel: readLabel(typeof label === 'string' ? label : ''),
  }
}

/** A label worth showing, or the one we ship with. */
export function readLabel(raw: string): string {
  const trimmed = raw.trim().slice(0, MAX_LAUNCHER_LABEL)
  return trimmed === '' ? DEFAULT_LAUNCHER_LABEL : trimmed
}

/** Settings ready to store, with nothing unknown carried along. */
export function writeAppSettings(settings: AppSettings): Record<string, boolean | string> {
  return { launcher: settings.launcher, launcherLabel: readLabel(settings.launcherLabel) }
}
