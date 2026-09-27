import { describe, expect, it } from 'vitest'
import { readAppSettings, writeAppSettings } from './settings'

describe('readAppSettings', () => {
  it('reads what an app turned on', () => {
    expect(readAppSettings({ launcher: true })).toEqual({ launcher: true })
  })

  it('leaves the launcher off unless the column says true', () => {
    // Wendmark appears inside someone else's product: anything unclear means
    // adding nothing to their interface.
    for (const stored of [{}, null, undefined, 'launcher', 42, { launcher: 'yes' }]) {
      expect(readAppSettings(stored).launcher).toBe(false)
    }
  })

  it('ignores settings a later version wrote', () => {
    expect(readAppSettings({ launcher: true, position: 'left' })).toEqual({ launcher: true })
  })
})

describe('writeAppSettings', () => {
  it('stores only what it knows about', () => {
    expect(writeAppSettings({ launcher: true })).toEqual({ launcher: true })
  })

  it('survives a round trip', () => {
    expect(readAppSettings(writeAppSettings({ launcher: true }))).toEqual({ launcher: true })
    expect(readAppSettings(writeAppSettings({ launcher: false }))).toEqual({ launcher: false })
  })
})
