import { describe, expect, it } from 'vitest'
import { readMessage } from './messages'

describe('readMessage', () => {
  it('reads the messages this extension sends', () => {
    expect(readMessage({ type: 'wendmark:ready' })).toEqual({ type: 'wendmark:ready' })
  })

  it('ignores anything else, without trusting its shape', () => {
    expect(readMessage(null)).toBeNull()
    expect(readMessage('wendmark:ready')).toBeNull()
    expect(readMessage({ type: 'something-else' })).toBeNull()
    // Extra fields are dropped, not passed along.
    expect(readMessage({ type: 'wendmark:ready', extra: 1 })).toEqual({ type: 'wendmark:ready' })
  })
})
