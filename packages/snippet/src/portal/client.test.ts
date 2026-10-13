import { afterEach, describe, expect, it, vi } from 'vitest'
import { REPORT_VERSION as CORE_REPORT_VERSION } from '@wendmark/core'
import { fetchConfig, fetchFlow, REPORT_VERSION, sendReport, type OutgoingReport } from './client'

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
      launcher: { enabled: false, label: 'How do I…' },
      reports: { enabled: false, labels: 'none' },
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

  it('calls the launcher whatever the app named it', async () => {
    answering(200, { flows: [], launcher: { enabled: true, label: 'Guides' } })
    expect((await fetchConfig('https://portal.test', 'wm_key', window)).launcher.label).toBe(
      'Guides',
    )
  })

  it('falls back to our own wording when the portal names nothing', async () => {
    for (const launcher of [{ enabled: true }, { enabled: true, label: '  ' }, {}]) {
      answering(200, { flows: [], launcher })
      expect((await fetchConfig('https://portal.test', 'wm_key', window)).launcher.label).toBe(
        'How do I…',
      )
    }
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

describe('reports in the config', () => {
  it('offers reports only when the portal says so, with its label policy', async () => {
    answering(200, { ...oneFlow, reports: { enabled: true, labels: 'all' } })
    expect((await fetchConfig('https://portal.test', 'wm_key', window)).reports).toEqual({
      enabled: true,
      labels: 'all',
    })
  })

  it('offers none when an older portal does not mention them', async () => {
    answering(200, oneFlow)
    expect((await fetchConfig('https://portal.test', 'wm_key', window)).reports.enabled).toBe(false)
  })

  it('reads an unknown label policy as the cautious one', async () => {
    answering(200, { ...oneFlow, reports: { enabled: true, labels: 'whatever' } })
    expect((await fetchConfig('https://portal.test', 'wm_key', window)).reports.labels).toBe('none')
  })
})

describe('sendReport', () => {
  const report: OutgoingReport = {
    reportVersion: REPORT_VERSION,
    note: 'Save did nothing',
    steps: [{ type: 'instruction', id: 's1', text: 'Something to read' }],
    pages: ['/'],
    labels: 'none',
  }

  it('writes the same report format the portal reads', () => {
    expect(REPORT_VERSION).toBe(CORE_REPORT_VERSION)
  })

  it("posts the report as JSON to the app's reports endpoint, without cookies", async () => {
    const stub = answering(202, null)
    expect(await sendReport('https://portal.test', 'wm_key', report, window)).toBe(true)

    const [url, init] = stub.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://portal.test/api/v1/reports?key=wm_key')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect(JSON.parse(String(init.body))).toEqual(report)
  })

  it('says so when it never got there, so the person can try again', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    expect(await sendReport('https://portal.test', 'wm_key', report, window)).toBe(false)
  })
})
