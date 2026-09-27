import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchConfig, fetchFlow } from './client'

/** Answers as the portal would, and reports what was asked for. */
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

const oneFlow = {
  flows: [
    { id: 'f1', name: 'Order coffee', description: 'How to order', steps: 3, appliesHere: true },
  ],
  launcher: { enabled: false },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchConfig', () => {
  it('asks the portal for this app, on this page, in a format it understands', async () => {
    const stub = answering(200, oneFlow)
    await fetchConfig('https://portal.test', 'wm_key', window)

    const url = String((stub.mock.calls[0] as [string])[0])
    expect(url).toContain('https://portal.test/api/v1/config')
    expect(url).toContain('key=wm_key')
    expect(url).toContain('v=1')
    expect(url).toContain('url=')
  })

  it('never sends the page’s cookies', async () => {
    const stub = answering(200, oneFlow)
    await fetchConfig('https://portal.test', 'wm_key', window)

    const [, init] = stub.mock.calls[0] as [string, RequestInit]
    expect(init.credentials).toBe('omit')
  })

  it('reads the processes it is offered', async () => {
    answering(200, oneFlow)
    const config = await fetchConfig('https://portal.test', 'wm_key', window)

    expect(config.flows).toEqual([
      { id: 'f1', name: 'Order coffee', description: 'How to order', steps: 3, appliesHere: true },
    ])
  })

  it('offers nothing when the portal cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    expect(await fetchConfig('https://portal.test', 'wm_key', window)).toEqual({
      flows: [],
      launcher: { enabled: false },
    })
  })

  it('offers nothing when the portal answers with an error', async () => {
    answering(500, null)
    expect((await fetchConfig('https://portal.test', 'wm_key', window)).flows).toEqual([])
  })

  it('ignores entries that are not processes, rather than failing on them', async () => {
    answering(200, { flows: [{ id: 'f1', name: 'Real' }, { name: 'No id' }, 'junk', null] })
    const config = await fetchConfig('https://portal.test', 'wm_key', window)

    expect(config.flows).toHaveLength(1)
    expect(config.flows[0]?.id).toBe('f1')
  })

  it('survives an answer of the wrong shape entirely', async () => {
    for (const body of [null, 'text', 42, {}, { flows: 'lots' }]) {
      answering(200, body)
      expect((await fetchConfig('https://portal.test', 'wm_key', window)).flows).toEqual([])
    }
  })

  it('treats the launcher as off unless the portal says otherwise', async () => {
    answering(200, { flows: [], launcher: { enabled: 'yes' } })
    const config = await fetchConfig('https://portal.test', 'wm_key', window)
    expect(config.launcher.enabled).toBe(false)
  })
})

describe('fetchFlow', () => {
  it('asks for one process by id', async () => {
    const stub = answering(200, { schemaVersion: 1, id: 'f1', name: 'Order', steps: [] })
    await fetchFlow('https://portal.test', 'wm_key', 'f1', window)

    const url = String((stub.mock.calls[0] as [string])[0])
    expect(url).toContain('/api/v1/flows/f1')
    expect(url).toContain('key=wm_key')
  })

  it('escapes an id rather than pasting it into the address', async () => {
    const stub = answering(404, null)
    await fetchFlow('https://portal.test', 'wm_key', '../admin', window)

    expect(String((stub.mock.calls[0] as [string])[0])).toContain('%2F')
  })

  it('answers with nothing for a process that is not published', async () => {
    answering(404, { error: 'That process is not available.' })
    expect(await fetchFlow('https://portal.test', 'wm_key', 'f1', window)).toBeNull()
  })

  it('answers with nothing when the portal cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    expect(await fetchFlow('https://portal.test', 'wm_key', 'f1', window)).toBeNull()
  })
})
