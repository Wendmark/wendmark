import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'

/**
 * The permission promise, as a test: the extension runs on a site only when
 * someone asks it to, and never asks for "all websites" up front. See
 * docs/decisions/browser-extension.md, "Permissions".
 */
describe('the manifest', () => {
  it('asks only for what clicking the icon needs', () => {
    expect([...manifest.permissions].sort()).toEqual([
      'activeTab',
      'scripting',
      'sidePanel',
      'storage',
    ])
  })

  it('grants no site at install', () => {
    expect(manifest).not.toHaveProperty('host_permissions')
    // Sites are asked for one at a time, when needed; these only say which
    // kinds of address may be asked for.
    expect(manifest.optional_host_permissions).toEqual(['https://*/*', 'http://*/*'])
  })

  it('runs in no page until asked', () => {
    expect(manifest).not.toHaveProperty('content_scripts')
    expect(JSON.stringify(manifest)).not.toContain('<all_urls>')
  })

  it('is Manifest V3, with a module service worker', () => {
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' })
  })
})
