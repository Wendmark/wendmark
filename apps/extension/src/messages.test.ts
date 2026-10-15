import { describe, expect, it } from 'vitest'
import { readDraft, readMessage } from './messages'

describe('readMessage', () => {
  it('reads each message this extension sends', () => {
    expect(readMessage({ type: 'wendmark:ready', origin: 'https://a.example' })).toEqual({
      type: 'wendmark:ready',
      origin: 'https://a.example',
    })
    expect(readMessage({ type: 'wendmark:record', tabId: 4 })).toEqual({
      type: 'wendmark:record',
      tabId: 4,
    })
    expect(readMessage({ type: 'wendmark:start-recording' })).toEqual({
      type: 'wendmark:start-recording',
    })
    expect(readMessage({ type: 'wendmark:draft-closed' })).toEqual({
      type: 'wendmark:draft-closed',
    })
    expect(
      readMessage({ type: 'wendmark:draft', draft: { name: 'x', steps: [{ type: 'action' }] } }),
    ).toEqual({ type: 'wendmark:draft', draft: { name: 'x', steps: [{ type: 'action' }] } })
  })

  it('ignores anything else, without trusting its shape', () => {
    expect(readMessage(null)).toBeNull()
    expect(readMessage('wendmark:ready')).toBeNull()
    expect(readMessage({ type: 'something-else' })).toBeNull()
    expect(readMessage({ type: 'wendmark:ready' })).toBeNull()
    expect(readMessage({ type: 'wendmark:record', tabId: '4' })).toBeNull()
    expect(readMessage({ type: 'wendmark:draft', draft: { name: 'x' } })).toBeNull()
  })

  it('drops fields it does not know', () => {
    expect(readMessage({ type: 'wendmark:start-recording', extra: 1 })).toEqual({
      type: 'wendmark:start-recording',
    })
    expect(readDraft({ name: 'x', steps: [], value: 'typed' })).toEqual({ name: 'x', steps: [] })
  })
})
