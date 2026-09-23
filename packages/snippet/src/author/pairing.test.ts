import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  askToRecord,
  clearHint,
  collectSession,
  generateCode,
  waitForApproval,
  wantsAuthorMode,
} from './pairing'

const PORTAL = 'https://wendmark.test'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('wantsAuthorMode', () => {
  it('recognises the hint the portal adds', () => {
    expect(wantsAuthorMode({ location: { hash: '#wm=author' } } as Window)).toBe(true)
  })

  it('ignores an ordinary page', () => {
    expect(wantsAuthorMode({ location: { hash: '' } } as Window)).toBe(false)
    expect(wantsAuthorMode({ location: { hash: '#/orders' } } as Window)).toBe(false)
  })
})

describe('clearHint', () => {
  it('takes the hint out, keeping the rest of the address', () => {
    const replaceState = vi.fn()
    clearHint({
      location: { hash: '#wm=author&tab=2', pathname: '/profile', search: '?q=1' },
      history: { replaceState },
    } as unknown as Window)
    expect(replaceState).toHaveBeenCalledWith(null, '', '/profile?q=1#tab=2')
  })

  it('leaves an ordinary address alone', () => {
    const replaceState = vi.fn()
    clearHint({
      location: { hash: '#/orders', pathname: '/', search: '' },
      history: { replaceState },
    } as unknown as Window)
    expect(replaceState).not.toHaveBeenCalled()
  })
})

describe('generateCode', () => {
  it('is long, random and different every time', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateCode(window)))
    expect(codes.size).toBe(50)
    expect(generateCode(window)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('askToRecord', () => {
  it('tells the portal which app, and the code it invented', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}', { status: 202 })))
    vi.stubGlobal('fetch', fetchMock)

    await expect(askToRecord(PORTAL, 'wm_key', 'abc')).resolves.toBe(true)

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('https://wendmark.test/api/v1/author/pair/start')
    expect(JSON.parse(String(call[1].body))).toEqual({ key: 'wm_key', code: 'abc' })
    expect(call[1].credentials).toBe('omit')
  })

  it('says no when the portal cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    )
    await expect(askToRecord(PORTAL, 'wm_key', 'abc')).resolves.toBe(false)
  })
})

describe('collectSession', () => {
  it('returns the session once the portal has approved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ sessionToken: 'session', appId: 'app-1', expiresAt: 'later' }),
            { status: 200 },
          ),
        ),
      ),
    )

    await expect(collectSession(PORTAL, 'abc')).resolves.toEqual({
      sessionToken: 'session',
      appId: 'app-1',
      expiresAt: 'later',
    })
  })

  it('reads a "not yet" as nothing to do', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ waiting: true }), { status: 202 })),
      ),
    )
    await expect(collectSession(PORTAL, 'abc')).resolves.toBeNull()
  })

  it('refuses a reply that is not a session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ hello: true }), { status: 200 }))),
    )
    await expect(collectSession(PORTAL, 'abc')).resolves.toBeNull()
  })
})

describe('waitForApproval', () => {
  it('keeps asking until the portal approves', async () => {
    let attempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        attempts += 1
        const approved = attempts >= 3
        return Promise.resolve(
          approved
            ? new Response(
                JSON.stringify({ sessionToken: 'session', appId: 'app-1', expiresAt: 'later' }),
                { status: 200 },
              )
            : new Response(JSON.stringify({ waiting: true }), { status: 202 }),
        )
      }),
    )

    const view = {
      setTimeout: (fn: () => void) => globalThis.setTimeout(fn, 0),
    } as unknown as Window
    const session = await waitForApproval(view, PORTAL, 'abc')

    expect(session?.sessionToken).toBe('session')
    expect(attempts).toBe(3)
  })
})
