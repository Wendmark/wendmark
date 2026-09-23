import { describe, expect, it } from 'vitest'
import { createLimiter } from './rate-limit'

/** A clock the test moves by hand, so nothing waits on real time. */
function clock(start = 1_000_000) {
  let time = start
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms
    },
  }
}

describe('createLimiter', () => {
  it('allows requests up to the limit', () => {
    const limiter = createLimiter({ allowed: 3, windowMs: 1_000 })
    expect([1, 2, 3].map(() => limiter.check('app').ok)).toEqual([true, true, true])
  })

  it('refuses the one after', () => {
    const limiter = createLimiter({ allowed: 2, windowMs: 1_000 })
    limiter.check('app')
    limiter.check('app')
    expect(limiter.check('app').ok).toBe(false)
  })

  it('says how long to wait', () => {
    const time = clock()
    const limiter = createLimiter({ allowed: 1, windowMs: 60_000 }, time.now)
    limiter.check('app')
    time.advance(10_000)
    expect(limiter.check('app').retryAfterSeconds).toBe(50)
  })

  it('counts each key separately', () => {
    const limiter = createLimiter({ allowed: 1, windowMs: 1_000 })
    expect(limiter.check('one').ok).toBe(true)
    expect(limiter.check('two').ok).toBe(true)
    expect(limiter.check('one').ok).toBe(false)
  })

  it('starts again once the window has passed', () => {
    const time = clock()
    const limiter = createLimiter({ allowed: 1, windowMs: 1_000 }, time.now)
    limiter.check('app')
    expect(limiter.check('app').ok).toBe(false)

    time.advance(1_000)
    expect(limiter.check('app').ok).toBe(true)
  })

  it('does not extend the window by trying again', () => {
    const time = clock()
    const limiter = createLimiter({ allowed: 1, windowMs: 1_000 }, time.now)
    limiter.check('app')

    time.advance(900)
    expect(limiter.check('app').ok).toBe(false)
    time.advance(100)
    expect(limiter.check('app').ok).toBe(true)
  })
})
