import { describe, expect, it } from 'vitest'
import { readPing } from './install'

const key = 'wm_4k7pq2r9wxz3m8n5ht'

describe('readPing', () => {
  it('accepts what the snippet sends', () => {
    expect(readPing({ key, origin: 'https://app.example.com', version: '0.0.0' })).toEqual({
      key,
      origin: 'https://app.example.com',
      version: '0.0.0',
    })
  })

  it('normalises the origin, so one site is not counted twice', () => {
    const ping = readPing({ key, origin: 'https://App.Example.com/', version: '0.0.0' })
    expect(ping?.origin).toBe('https://app.example.com')
  })

  it('refuses anything that is not one of our keys', () => {
    expect(readPing({ key: 'sk_live_secret', origin: 'https://a.test', version: '1' })).toBeNull()
    expect(readPing({ origin: 'https://a.test', version: '1' })).toBeNull()
  })

  it('refuses a missing or nonsensical origin', () => {
    expect(readPing({ key, version: '1' })).toBeNull()
    expect(readPing({ key, origin: 'not an origin', version: '1' })).toBeNull()
  })

  it('refuses a body that is not an object', () => {
    expect(readPing(null)).toBeNull()
    expect(readPing('wm_key')).toBeNull()
    expect(readPing(42)).toBeNull()
  })

  it('caps the version string rather than storing whatever arrives', () => {
    const ping = readPing({ key, origin: 'https://a.test', version: 'x'.repeat(500) })
    expect(ping?.version.length).toBe(20)
  })
})
