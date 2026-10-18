import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'
import { storeManifest } from './package.mjs'

describe('the manifest the store gets', () => {
  it('is the manifest without its development key', () => {
    const packed = storeManifest(manifest, manifest.version)
    expect(packed).not.toHaveProperty('key')
    const { key: _key, ...rest } = manifest
    expect(packed).toEqual(rest)
  })

  it('refuses a version that does not match package.json', () => {
    expect(() => storeManifest(manifest, '9.9.9')).toThrow(/package\.json/)
  })

  it('refuses a manifest that asks for sites at install', () => {
    const greedy = { ...manifest, host_permissions: ['<all_urls>'] }
    expect(() => storeManifest(greedy, manifest.version)).toThrow(/install/)
  })
})
