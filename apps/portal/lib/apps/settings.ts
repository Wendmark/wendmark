import { DEFAULT_LABEL_POLICY, readLabelPolicy, type LabelPolicy } from '@wendmark/core'

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
  /**
   * Whether end users may report a problem by retracing it.
   *
   * Off until an administrator turns it on, and not because the feature is
   * unfinished: a report is the one thing Wendmark stores that can contain
   * the app's own customers' data, and that is the operator's decision to
   * make. See docs/decisions/problem-reports.md.
   */
  reports: boolean
  /**
   * How much of what the page said a report may keep.
   *
   * `none` strips every label; `all` keeps them. The default strips, because
   * the same field that reads "Issue refund" on a staff member's screen
   * reads "Order FK-10421" on a customer's.
   */
  reportLabels: LabelPolicy
  /** How many days a report is kept before it is deleted outright. */
  reportRetentionDays: number
}

/** Long enough to work through a support queue, short enough to forget. */
export const DEFAULT_RETENTION_DAYS = 90

/** Shorter than this is not a support queue; longer is not retention. */
export const MIN_RETENTION_DAYS = 7
export const MAX_RETENTION_DAYS = 365

/** A retention period worth storing, or the one we ship with. */
export function readRetentionDays(raw: unknown): number {
  const days = Math.trunc(Number(raw))
  if (!Number.isFinite(days)) return DEFAULT_RETENTION_DAYS
  if (days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) return DEFAULT_RETENTION_DAYS
  return days
}

export const DEFAULT_SETTINGS: AppSettings = {
  launcher: false,
  launcherLabel: DEFAULT_LAUNCHER_LABEL,
  reports: false,
  reportLabels: DEFAULT_LABEL_POLICY,
  reportRetentionDays: DEFAULT_RETENTION_DAYS,
}

/** The settings an app has, whatever the column actually holds. */
export function readAppSettings(stored: unknown): AppSettings {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_SETTINGS

  const candidate = stored as Record<string, unknown>
  const label = candidate['launcherLabel']

  return {
    launcher: candidate['launcher'] === true,
    launcherLabel: readLabel(typeof label === 'string' ? label : ''),
    reports: candidate['reports'] === true,
    reportLabels: readLabelPolicy(candidate['reportLabels']),
    reportRetentionDays: readRetentionDays(candidate['reportRetentionDays']),
  }
}

/** A label worth showing, or the one we ship with. */
export function readLabel(raw: string): string {
  const trimmed = raw.trim().slice(0, MAX_LAUNCHER_LABEL)
  return trimmed === '' ? DEFAULT_LAUNCHER_LABEL : trimmed
}

/** Settings ready to store, with nothing unknown carried along. */
export function writeAppSettings(settings: AppSettings): Record<string, boolean | string | number> {
  return {
    launcher: settings.launcher,
    launcherLabel: readLabel(settings.launcherLabel),
    reports: settings.reports,
    reportLabels: readLabelPolicy(settings.reportLabels),
    reportRetentionDays: readRetentionDays(settings.reportRetentionDays),
  }
}
