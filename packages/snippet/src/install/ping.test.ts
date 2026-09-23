import { afterEach, describe, expect, it, vi } from 'vitest'
import { appKey, portalOrigin, sendInstallPing } from './ping'

function withScript(attributes: string): void {
  document.head.innerHTML = `<script ${attributes}></script>`
}

afterEach(() => {
  document.head.innerHTML = ''
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('reading the script tag', () => {
  it('finds the app key the customer pasted', () => {
    withScript('src="https://wendmark.test/snippet.js" data-app="wm_abc123"')
    expect(appKey(document)).toBe('wm_abc123')
  })

  it('has no key when the tag has none', () => {
    withScript('src="https://wendmark.test/snippet.js"')
    expect(appKey(document)).toBeNull()
  })

  it('knows the portal is wherever the snippet came from', () => {
    withScript('src="https://wendmark.test/snippet.js" data-app="wm_abc123"')
    expect(portalOrigin(document)).toBe('https://wendmark.test')
  })

  it('has no portal when the snippet was not loaded from one', () => {
    document.head.innerHTML = ''
    expect(portalOrigin(document)).toBeNull()
  })
})

describe('sendInstallPing', () => {
  function stubFetch() {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 202 })))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('tells the portal which app and origin, and nothing else', () => {
    withScript('src="https://wendmark.test/snippet.js" data-app="wm_abc123"')
    const fetchMock = stubFetch()

    sendInstallPing(document, window, '0.0.0')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('https://wendmark.test/api/v1/ping')
    expect(JSON.parse(String(call[1].body))).toEqual({
      key: 'wm_abc123',
      origin: window.location.origin,
      version: '0.0.0',
    })
    expect(call[1].credentials).toBe('omit')
  })

  it('says hello once per tab, not on every page', () => {
    withScript('src="https://wendmark.test/snippet.js" data-app="wm_abc123"')
    const fetchMock = stubFetch()

    sendInstallPing(document, window, '0.0.0')
    sendInstallPing(document, window, '0.0.0')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('says nothing when the customer set no app key', () => {
    withScript('src="https://wendmark.test/snippet.js"')
    const fetchMock = stubFetch()

    sendInstallPing(document, window, '0.0.0')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stays quiet when the portal cannot be reached', () => {
    withScript('src="https://wendmark.test/snippet.js" data-app="wm_abc123"')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    )
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => sendInstallPing(document, window, '0.0.0')).not.toThrow()
    expect(errors).not.toHaveBeenCalled()
  })
})
