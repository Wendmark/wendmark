import { describe, expect, it } from 'vitest'
import { configEtag, readFormatVersion, type Config } from './config'

function config(overrides: Partial<Config> = {}): Config {
  return {
    flows: [{ id: 'f1', name: 'Order coffee', description: null, steps: 3, version: 2 }],
    launcher: { enabled: false },
    ...overrides,
  }
}

describe('readFormatVersion', () => {
  it('assumes the first format when a snippet does not say', () => {
    expect(readFormatVersion(null)).toBe(1)
    expect(readFormatVersion('')).toBe(1)
  })

  it('ignores nonsense rather than refusing', () => {
    expect(readFormatVersion('latest')).toBe(1)
    expect(readFormatVersion('1.5')).toBe(1)
    expect(readFormatVersion('0')).toBe(1)
    expect(readFormatVersion('-3')).toBe(1)
  })

  it('never claims a snippet understands more than this portal writes', () => {
    // A newer snippet against an older portal is served what exists.
    expect(readFormatVersion('99')).toBe(1)
  })
})

describe('configEtag', () => {
  it('is stable for the same answer', () => {
    expect(configEtag(config())).toBe(configEtag(config()))
  })

  it('changes when a process is published', () => {
    const before = configEtag({ flows: [], launcher: { enabled: false } })
    expect(configEtag(config())).not.toBe(before)
  })

  it('changes when a published process is renamed', () => {
    const renamed = config({
      flows: [{ id: 'f1', name: 'Order beans', description: null, steps: 3, version: 2 }],
    })
    expect(configEtag(renamed)).not.toBe(configEtag(config()))
  })

  it('changes when a new version of the same process is published', () => {
    const republished = config({
      flows: [{ id: 'f1', name: 'Order coffee', description: null, steps: 3, version: 3 }],
    })
    expect(configEtag(republished)).not.toBe(configEtag(config()))
  })

  it('is quoted, as an entity tag must be', () => {
    expect(configEtag(config())).toMatch(/^"[0-9a-f]{32}"$/)
  })
})
