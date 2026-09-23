import { describe, expect, it } from 'vitest'
import { generatePublicKey, isPublicKey } from './keys'

describe('generatePublicKey', () => {
  it('is recognisable as ours', () => {
    expect(generatePublicKey().startsWith('wm_')).toBe(true)
    expect(isPublicKey(generatePublicKey())).toBe(true)
  })

  it('is different every time', () => {
    const keys = new Set(Array.from({ length: 200 }, generatePublicKey))
    expect(keys.size).toBe(200)
  })

  it('avoids characters that are easy to misread', () => {
    const body = generatePublicKey().slice(3)
    expect(body).not.toMatch(/[ilou]/)
  })
})

describe('isPublicKey', () => {
  it('rejects anything without our prefix', () => {
    expect(isPublicKey('sk_live_abc')).toBe(false)
    expect(isPublicKey('')).toBe(false)
  })

  it('rejects the wrong length', () => {
    expect(isPublicKey('wm_short')).toBe(false)
    expect(isPublicKey(`wm_${'a'.repeat(40)}`)).toBe(false)
  })

  it('rejects characters that are not in the alphabet', () => {
    expect(isPublicKey(`wm_${'A'.repeat(18)}`)).toBe(false)
    expect(isPublicKey(`wm_${'-'.repeat(18)}`)).toBe(false)
  })
})
