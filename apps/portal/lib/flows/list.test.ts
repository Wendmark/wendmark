import { describe, expect, it } from 'vitest'
import { canPause, canResume, copyName, describeStatus, isLive, stepCount } from './list'

describe('stepCount', () => {
  it('counts the steps of a stored flow', () => {
    expect(stepCount([{ id: 's1' }, { id: 's2' }])).toBe(2)
  })

  it('survives a column that does not hold an array', () => {
    for (const stored of [null, undefined, 'steps', 42, {}]) {
      expect(stepCount(stored)).toBe(0)
    }
  })
})

describe('status', () => {
  it('is live only when published', () => {
    expect(isLive('published')).toBe(true)
    expect(isLive('draft')).toBe(false)
    expect(isLive('paused')).toBe(false)
  })

  it('can pause only what users can currently see', () => {
    expect(canPause('published')).toBe(true)
    expect(canPause('draft')).toBe(false)
    expect(canPause('paused')).toBe(false)
  })

  it('can resume only what was paused', () => {
    expect(canResume('paused')).toBe(true)
    expect(canResume('draft')).toBe(false)
    expect(canResume('published')).toBe(false)
  })

  it('says what each status means without jargon', () => {
    expect(describeStatus('published')).toBe('Users can see this')
    expect(describeStatus('paused')).toBe('Hidden from users')
    expect(describeStatus('draft')).toBe('Not published yet')
  })
})

describe('copyName', () => {
  it('marks a copy as one', () => {
    expect(copyName('Order coffee', [])).toBe('Order coffee (copy)')
  })

  it('does not reuse a name that is taken', () => {
    expect(copyName('Order coffee', ['Order coffee', 'Order coffee (copy)'])).toBe(
      'Order coffee (copy 2)',
    )
  })

  it('keeps counting past the second copy', () => {
    const existing = ['Order coffee (copy)', 'Order coffee (copy 2)', 'Order coffee (copy 3)']
    expect(copyName('Order coffee', existing)).toBe('Order coffee (copy 4)')
  })

  it('copies a copy without nesting forever', () => {
    expect(copyName('Order coffee (copy)', ['Order coffee (copy)'])).toBe(
      'Order coffee (copy) (copy)',
    )
  })
})
