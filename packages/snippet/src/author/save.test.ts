import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Flow } from '@wendmark/core'
import { saveDraft } from './save'

const flow: Flow = {
  schemaVersion: 1,
  id: 'draft-1',
  name: 'Order coffee',
  steps: [
    {
      id: 's1',
      type: 'action',
      text: 'Open the cart',
      dynamic: false,
      target: { selectors: ['#cart'], role: 'button', name: 'Cart' },
    },
  ],
}

/** Replaces fetch with one that answers as the portal would. */
function answering(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const stub = vi.fn(async () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => Promise.resolve(body),
    } as Response),
  )
  vi.stubGlobal('fetch', stub)
  return stub
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saveDraft', () => {
  it('posts the flow and the session to the portal', async () => {
    const stub = answering(201, { id: 'flow-1', name: 'Order coffee', status: 'draft' })
    await saveDraft('https://portal.test', 'a-session', flow)

    const [url, init] = stub.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://portal.test/api/v1/author/flows')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ sessionToken: 'a-session', flow })
  })

  it('never sends the page’s cookies', async () => {
    const stub = answering(201, { id: 'flow-1', name: 'Order coffee' })
    await saveDraft('https://portal.test', 'a-session', flow)

    const [, init] = stub.mock.calls[0] as [string, RequestInit]
    expect(init.credentials).toBe('omit')
  })

  it('reports what was saved', async () => {
    answering(201, { id: 'flow-1', name: 'Order coffee' })
    const result = await saveDraft('https://portal.test', 'a-session', flow)

    expect(result).toEqual({ ok: true, id: 'flow-1', name: 'Order coffee' })
  })

  it('passes the portal’s explanation back to the author', async () => {
    answering(400, { error: 'steps.0: Invalid input' })
    const result = await saveDraft('https://portal.test', 'a-session', flow)

    expect(result).toEqual({ ok: false, error: 'steps.0: Invalid input' })
  })

  it('has something to say when the portal explains nothing', async () => {
    answering(500, null)
    const result = await saveDraft('https://portal.test', 'a-session', flow)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).not.toBe('')
  })

  it('does not throw when the portal cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    const result = await saveDraft('https://portal.test', 'a-session', flow)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('portal')
  })

  it('refuses an answer with no id, rather than claiming success', async () => {
    answering(201, { name: 'Order coffee' })
    expect((await saveDraft('https://portal.test', 'a-session', flow)).ok).toBe(false)
  })
})
