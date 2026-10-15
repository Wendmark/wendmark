import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'
import { EXTENSION_ID } from './play'

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

  it('takes guides only from the play page on wendmark.dev', () => {
    expect(manifest.externally_connectable).toEqual({ matches: ['https://wendmark.dev/*'] })
  })

  it('has a fixed id, so the play page can find it', async () => {
    // The id is the first 128 bits of the SHA-256 of the public key, as a–p.
    const der = Uint8Array.from(atob(manifest.key), (char) => char.charCodeAt(0))
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', der))
    const id = [...hash.slice(0, 16)]
      .flatMap((byte) => [byte >> 4, byte & 15])
      .map((nibble) => String.fromCharCode(97 + nibble))
      .join('')
    expect(id).toBe(EXTENSION_ID)
  })

  it('is Manifest V3, with a module service worker', () => {
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' })
  })
})
