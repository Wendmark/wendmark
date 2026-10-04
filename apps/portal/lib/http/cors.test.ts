import { describe, expect, it } from 'vitest'
import { allowedHeaders } from './cors'

describe('allowedHeaders', () => {
  it('allows what we rely on when the browser asks for nothing', () => {
    expect(allowedHeaders(null)).toBe('content-type')
    expect(allowedHeaders('')).toBe('content-type')
  })

  it('allows a header the host page’s fetch adds', () => {
    // An app with wrapped fetch — telemetry, tracing — sends headers we
    // never asked for, and refusing them blocks the whole request.
    expect(allowedHeaders('content-type,request-id')).toBe('content-type, request-id')
  })

  it('keeps content-type even when the browser did not mention it', () => {
    expect(allowedHeaders('request-id')).toBe('content-type, request-id')
  })

  it('does not repeat content-type', () => {
    expect(allowedHeaders('Content-Type, traceparent')).toBe('Content-Type, traceparent')
  })

  it('tidies the spacing browsers use', () => {
    expect(allowedHeaders('  x-one ,x-two  ')).toBe('content-type, x-one, x-two')
  })

  it('drops anything that is not a header name', () => {
    expect(allowedHeaders('good-one, bad header, "quoted"')).toBe('content-type, good-one')
  })

  it('refuses a list longer than anyone sensibly sends', () => {
    expect(allowedHeaders('x-a,'.repeat(400))).toBe('content-type')
  })
})
