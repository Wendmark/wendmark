import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkFlow } from '@wendmark/core/guard'
import type { Step } from '@wendmark/core'
import { fetchReplay, replay, replayFlow } from './replay'
import type { AuthorContext } from './loader'

const PORTAL = 'https://wendmark.test'

const press: Step = {
  type: 'action',
  id: 's1',
  text: 'Press a button',
  dynamic: false,
  target: { selectors: ['[data-testid="change-plan"]'], role: 'button', url: '/subscription' },
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('replayFlow', () => {
  it('is a playable flow that opens by saying what it is', () => {
    const flow = replayFlow({ id: 'r1', note: 'Plan did not change\nmore detail', steps: [press] })

    expect(checkFlow(flow)).toBe('ok')
    expect(flow.steps).toHaveLength(2)
    const intro = flow.steps[0]
    expect(intro?.type).toBe('instruction')
    expect(intro?.text).toContain('not necessarily the right ones')
    // Only the first line of what they wrote.
    expect(intro?.text).toContain('“Plan did not change”')
    expect(flow.steps[1]).toEqual(press)
  })

  it('keeps a long note short', () => {
    const flow = replayFlow({ id: 'r1', note: 'x'.repeat(500), steps: [press] })
    expect(flow.steps[0]?.text.length).toBeLessThan(400)
  })
})

describe('fetchReplay', () => {
  it('asks for the report with the session token in the body, not the address', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 'r1', note: 'n', steps: [press] }), { status: 200 }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchReplay(PORTAL, 'tok')).resolves.toEqual({
      id: 'r1',
      note: 'n',
      steps: [press],
    })
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('https://wendmark.test/api/v1/author/replay')
    expect(JSON.parse(String(call[1].body))).toEqual({ sessionToken: 'tok' })
    expect(call[1].credentials).toBe('omit')
  })

  it('gives nothing back when refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 401 }))),
    )
    await expect(fetchReplay(PORTAL, 'tok')).resolves.toBeNull()
  })
})

describe('replay', () => {
  function context(startFlow: AuthorContext['api']['startFlow']): AuthorContext {
    return {
      session: { sessionToken: 'tok', appId: 'a', expiresAt: '' },
      portalOrigin: PORTAL,
      doc: document,
      view: window,
      api: { startFlow, stopFlow: vi.fn(), startRecording: vi.fn() },
    }
  }

  it('plays the report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: 'r1', note: '', steps: [press] }), { status: 200 }),
        ),
      ),
    )
    const startFlow = vi.fn()
    await replay(context(startFlow))

    expect(startFlow).toHaveBeenCalledOnce()
    expect(startFlow.mock.calls[0]?.[0]).toMatchObject({ id: 'report-r1' })
    expect(startFlow.mock.calls[0]?.[1]).toEqual({ remember: false })
  })

  it('says so when the report cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    )
    const startFlow = vi.fn()
    await replay(context(startFlow))

    expect(startFlow.mock.calls[0]?.[0]).toMatchObject({ id: 'report-unavailable' })
  })
})
