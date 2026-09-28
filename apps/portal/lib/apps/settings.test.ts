import { describe, expect, it } from 'vitest'
import { DEFAULT_LAUNCHER_LABEL, readAppSettings, writeAppSettings } from './settings'

describe('readAppSettings', () => {
  it('reads what an app turned on', () => {
    expect(readAppSettings({ launcher: true })).toEqual({
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
      launcher: true,
      launcherLabel: DEFAULT_LAUNCHER_LABEL,
    })
  })
})

describe('writeAppSettings', () => {
  it('stores only what it knows about', () => {
    expect(writeAppSettings({ launcher: true, launcherLabel: 'Guides' })).toEqual({
      launcher: true,
      launcherLabel: 'Guides',
    })
  })

  it('survives a round trip', () => {
    const settings = { launcher: true, launcherLabel: 'Show me how' }
    expect(readAppSettings(writeAppSettings(settings))).toEqual(settings)
  })

  it('stores our wording rather than an empty label', () => {
    expect(writeAppSettings({ launcher: false, launcherLabel: '  ' }).launcherLabel).toBe(
      DEFAULT_LAUNCHER_LABEL,
    )
  })
})
