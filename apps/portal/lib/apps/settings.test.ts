import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LAUNCHER_LABEL,
  readAppSettings,
  writeAppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_RETENTION_DAYS,
  readRetentionDays,
} from './settings'

describe('readAppSettings', () => {
  it('reads what an app turned on', () => {
    expect(readAppSettings({ launcher: true })).toEqual({
      ...DEFAULT_SETTINGS,
      launcher: true,
      launcherLabel: DEFAULT_LAUNCHER_LABEL,
    })
  })

  it('reads a label an app chose for itself', () => {
    expect(readAppSettings({ launcher: true, launcherLabel: 'Guides' }).launcherLabel).toBe(
      'Guides',
    )
  })

  it('falls back to our wording when the label says nothing', () => {
    for (const label of ['', '   ', 42, null, undefined]) {
      expect(readAppSettings({ launcher: true, launcherLabel: label }).launcherLabel).toBe(
        DEFAULT_LAUNCHER_LABEL,
      )
    }
  })

  it('will not let a label grow long enough to break the button', () => {
    const long = 'x'.repeat(200)
    expect(readAppSettings({ launcherLabel: long }).launcherLabel.length).toBe(40)
  })

  it('leaves the launcher off unless the column says true', () => {
    // Wendmark appears inside someone else's product: anything unclear means
    // adding nothing to their interface.
    for (const stored of [{}, null, undefined, 'launcher', 42, { launcher: 'yes' }]) {
      expect(readAppSettings(stored).launcher).toBe(false)
    }
  })

  it('ignores settings a later version wrote', () => {
    expect(readAppSettings({ launcher: true, position: 'left' })).toEqual({
      ...DEFAULT_SETTINGS,
      launcher: true,
    })
  })
})

describe('writeAppSettings', () => {
  it('stores only what it knows about', () => {
    expect(
      writeAppSettings({ ...DEFAULT_SETTINGS, launcher: true, launcherLabel: 'Guides' }),
    ).toEqual({ ...DEFAULT_SETTINGS, launcher: true, launcherLabel: 'Guides' })
  })

  it('survives a round trip', () => {
    const settings = { ...DEFAULT_SETTINGS, launcher: true, launcherLabel: 'Show me how' }
    expect(readAppSettings(writeAppSettings(settings))).toEqual(settings)
  })

  it('stores our wording rather than an empty label', () => {
    expect(
      writeAppSettings({ ...DEFAULT_SETTINGS, launcher: false, launcherLabel: '  ' }).launcherLabel,
    ).toBe(DEFAULT_LAUNCHER_LABEL)
  })
})

describe('report settings', () => {
  it('are off, structure only, and ninety days until an app says otherwise', () => {
    const settings = readAppSettings({})
    expect(settings.reports).toBe(false)
    expect(settings.reportLabels).toBe('none')
    expect(settings.reportRetentionDays).toBe(DEFAULT_RETENTION_DAYS)
  })

  it('needs reports turned on explicitly, like the launcher', () => {
    expect(readAppSettings({ reports: 'yes' }).reports).toBe(false)
    expect(readAppSettings({ reports: 1 }).reports).toBe(false)
    expect(readAppSettings({ reports: true }).reports).toBe(true)
  })

  it('falls back to keeping nothing when the policy is not one we know', () => {
    // The cautious direction matters: a column holding a policy written by
    // some future version must not read as "keep the labels".
    for (const stored of ['fixed-only', '', null, 7, {}]) {
      expect(readAppSettings({ reportLabels: stored }).reportLabels).toBe('none')
    }
  })

  it('takes a policy it recognises', () => {
    expect(readAppSettings({ reportLabels: 'all' }).reportLabels).toBe('all')
  })

  it.each([[0], [-1], [6], [366], ['soon'], [null], [NaN], [Infinity]])(
    'refuses %p as a retention period and keeps the default',
    (stored) => {
      expect(readRetentionDays(stored)).toBe(DEFAULT_RETENTION_DAYS)
    },
  )

  it.each([[7], [30], [90], [365], ['45'], [45.9]])('accepts %p days', (stored) => {
    expect(readRetentionDays(stored)).toBe(Math.trunc(Number(stored)))
  })

  it('survives a round trip through the column', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      reports: true,
      reportLabels: 'all' as const,
      reportRetentionDays: 30,
    }
    expect(readAppSettings(writeAppSettings(settings))).toEqual(settings)
  })

  it('does not carry along a key it has never heard of', () => {
    const stored = writeAppSettings({ ...DEFAULT_SETTINGS, reports: true })
    expect(Object.keys(stored).sort()).toEqual([
      'launcher',
      'launcherLabel',
      'reportLabels',
      'reportRetentionDays',
      'reports',
    ])
  })
})
