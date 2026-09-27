/**
 * What the snippet reads about an app on load.
 *
 * Kept in one JSON column rather than a column per switch: these are small,
 * they change as the snippet grows, and none of them is worth a migration.
 * Read defensively — the column may hold anything a previous version wrote.
 */

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
}

export const DEFAULT_SETTINGS: AppSettings = { launcher: false }

/** The settings an app has, whatever the column actually holds. */
export function readAppSettings(stored: unknown): AppSettings {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_SETTINGS

  const candidate = stored as Record<string, unknown>
  return {
    launcher: candidate['launcher'] === true,
  }
}

/** Settings ready to store, with nothing unknown carried along. */
export function writeAppSettings(settings: AppSettings): Record<string, boolean> {
  return { launcher: settings.launcher }
}
