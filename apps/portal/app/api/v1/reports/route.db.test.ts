import { describe, expect, it } from 'vitest'
import { makeWorld, reportBody } from '../../../../test/factories'
import { setReports } from '../../../../lib/apps/service'
import { getDb } from '../../../../lib/db'
import { MAX_BODY_BYTES } from '../../../../lib/reports/write'
import { OPTIONS, POST } from './route'

/**
 * The public end of the report path, exercised as a request rather than as a
 * function call.
 *
 * Who is allowed to write a row here is decided by the Origin and the app's
 * own switch, and both of those live in the route rather than in the service.
 * They are also the only thing standing between a key anybody can read out
 * of a page and a table that can hold somebody's customer data, so they are
 * worth a test that goes through the handler.
 *
 * Every case answers 202. What is being asserted is whether a row appeared.
 */

const ALLOWED = 'https://app.example.com'

/** An app with reports on, plus a unique key so the rate limiter is fresh. */
async function appWithReports(name: string) {
  const world = await makeWorld(name)
  await setReports(world.ctx, world.appId, { enabled: true })
  const app = await getDb().app.findUniqueOrThrow({
    where: { id: world.appId },
    select: { publicKey: true },
  })
  return { ...world, publicKey: app.publicKey }
}

function send(
  key: string,
  body: unknown,
  headers: Record<string, string> = { origin: ALLOWED },
): Promise<Response> {
  return POST(
    new Request(`https://portal.test/api/v1/reports?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

describe('a report sent from an address the app registered', () => {
  it('is accepted and stored', async () => {
    const acme = await appWithReports('Acme')
    const response = await send(acme.publicKey, reportBody())

    expect(response.status).toBe(202)
    expect(await getDb().report.count()).toBe(1)
  })

  it('is told nothing about what happened to it', async () => {
    const acme = await appWithReports('Terse')
    const response = await send(acme.publicKey, reportBody())

    expect(await response.json()).toEqual({ ok: true })
  })
})

describe('what the endpoint refuses to write, while still saying 202', () => {
  it('a key that belongs to nobody', async () => {
    await appWithReports('Acme')
    const response = await send('wm_nosuchkeyatall00', reportBody())

    expect(response.status).toBe(202)
    expect(await getDb().report.count()).toBe(0)
  })

  it('a key that is not even key-shaped', async () => {
    await appWithReports('Acme')
    expect((await send('../../etc/passwd', reportBody())).status).toBe(202)
    expect(await getDb().report.count()).toBe(0)
  })

  it('a request that does not say where it came from', async () => {
    // Config answers a request with no Origin, because what it returns is
    // public metadata. This writes a row, so it does not.
    const acme = await appWithReports('Anon')
    await send(acme.publicKey, reportBody(), {})

    expect(await getDb().report.count()).toBe(0)
  })

  it('an address that is not on the app’s list', async () => {
    const acme = await appWithReports('Elsewhere')
    await send(acme.publicKey, reportBody(), { origin: 'https://evil.example.com' })

    expect(await getDb().report.count()).toBe(0)
  })

  it('a body that is not JSON', async () => {
    const acme = await appWithReports('Garbled')
    expect((await send(acme.publicKey, 'not json at all')).status).toBe(202)
    expect(await getDb().report.count()).toBe(0)
  })

  it('a body that is JSON but not a report', async () => {
    const acme = await appWithReports('Shapeless')
    await send(acme.publicKey, { hello: 'there' })

    expect(await getDb().report.count()).toBe(0)
  })

  it('a report carrying a key nobody declared', async () => {
    const acme = await appWithReports('Smuggler')
    await send(acme.publicKey, reportBody({ screenshot: 'data:image/png;base64,iVBOR' }))

    expect(await getDb().report.count()).toBe(0)
  })

  it('a body too large to be an honest report', async () => {
    const acme = await appWithReports('Enormous')
    const huge = reportBody({ note: 'x'.repeat(MAX_BODY_BYTES + 1) })
    await send(acme.publicKey, huge)

    expect(await getDb().report.count()).toBe(0)
  })

  it('a body whose declared length is too large, before reading it', async () => {
    const acme = await appWithReports('Liar')
    await send(acme.publicKey, reportBody(), {
      origin: ALLOWED,
      'content-length': String(MAX_BODY_BYTES + 1),
    })

    expect(await getDb().report.count()).toBe(0)
  })
})

describe('how many a single page may send', () => {
  it('stops after a handful in a minute', async () => {
    const acme = await appWithReports('Insistent')

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await send(acme.publicKey, reportBody({ note: `Attempt ${attempt}` }))
      // Still 202: being rate limited is not something a caller is told.
      expect(response.status).toBe(202)
    }

    expect(await getDb().report.count()).toBe(5)
  })
})

describe('the preflight', () => {
  it('allows the POST a browser is about to make', async () => {
    const response = OPTIONS(
      new Request('https://portal.test/api/v1/reports', {
        method: 'OPTIONS',
        headers: { origin: ALLOWED, 'access-control-request-headers': 'content-type, traceparent' },
      }),
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-methods')).toContain('POST')
    // Echoed, because apps wrap fetch and our requests arrive carrying
    // headers we never asked for. See lib/http/cors.ts.
    expect(response.headers.get('access-control-allow-headers')).toContain('traceparent')
    expect(response.headers.get('vary')).toBe('Origin')
  })
})
