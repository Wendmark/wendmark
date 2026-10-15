import type { Flow, Step } from '@wendmark/core'
import { describe, expect, it, vi } from 'vitest'
import { progressReporter, readExternalMessage, sitePattern, startUrl, stepsAsLines } from './play'

function flowStartingOn(url: string | undefined): Flow {
  const first: Step = {
    type: 'action',
    id: 's1',
    text: 'Press a button',
    dynamic: false,
    target: { selectors: ['#go'], ...(url ? { url } : {}) },
  }
  return {
    schemaVersion: 1,
    id: 'd',
    name: 'Guide',
    steps: [{ type: 'instruction', id: 's0', text: 'Read this first' }, first],
  }
}

describe('where a shared guide opens', () => {
  const origin = 'https://app.example.com'

  it('on its first page', () => {
    expect(startUrl({ origin, flow: flowStartingOn('/settings/billing') })).toBe(
      'https://app.example.com/settings/billing',
    )
  })

  it('at the front page when the first page had an id masked out, or none is known', () => {
    expect(startUrl({ origin, flow: flowStartingOn('/orders/*') })).toBe('https://app.example.com/')
    expect(startUrl({ origin, flow: flowStartingOn(undefined) })).toBe('https://app.example.com/')
  })

  it('asks for exactly that site', () => {
    expect(sitePattern(origin)).toBe('https://app.example.com/*')
  })
})

describe('messages from the play page', () => {
  it('reads hello and play, and nothing else', () => {
    expect(readExternalMessage({ type: 'wendmark:hello' })).toEqual({ type: 'wendmark:hello' })
    expect(readExternalMessage({ type: 'wendmark:play', link: 'https://x#g=a', extra: 1 })).toEqual(
      {
        type: 'wendmark:play',
        link: 'https://x#g=a',
      },
    )
    expect(readExternalMessage({ type: 'wendmark:play' })).toBeNull()
    expect(readExternalMessage({ type: 'wendmark:record', tabId: 1 })).toBeNull()
    expect(readExternalMessage({ type: 'wendmark:play', link: 'x'.repeat(200_000) })).toBeNull()
  })
})

describe('progressReporter', () => {
  it('passes on the step the player saves, and stores nothing', () => {
    const onStep = vi.fn()
    const storage = progressReporter(onStep)
    storage.setItem('wendmark:progress', JSON.stringify({ flowId: 'd', stepIndex: 3 }))
    storage.setItem('other', 'not json')
    expect(onStep).toHaveBeenCalledExactlyOnceWith(3)
    expect(storage.getItem('wendmark:progress')).toBeNull()
  })
})

describe('stepsAsLines', () => {
  it('numbers the steps', () => {
    expect(stepsAsLines(flowStartingOn('/x'))).toEqual(['1. Read this first', '2. Press a button'])
  })
})
