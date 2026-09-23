import { getDb } from '../db'
import { isAllowedOrigin, parseOrigin } from './origins'
import { isPublicKey } from './keys'

/** What the snippet tells us when it loads. Nothing about the user. */
export interface Ping {
  key: string
  origin: string
  version: string
}

export type PingOutcome =
  { status: 'recorded' } | { status: 'unknown-origin' } | { status: 'ignored' }

/**
 * Only update when the last sighting is older than this, so a busy site does
 * not write a row on every page load.
 */
const QUIET_PERIOD_MS = 60_000

/** Reads a ping body, rejecting anything that is not one. */
export function readPing(body: unknown): Ping | null {
  if (typeof body !== 'object' || body === null) return null
  const candidate = body as Record<string, unknown>

  const key = typeof candidate['key'] === 'string' ? candidate['key'] : ''
  const origin = typeof candidate['origin'] === 'string' ? candidate['origin'] : ''
  const version = typeof candidate['version'] === 'string' ? candidate['version'].slice(0, 20) : ''

  if (!isPublicKey(key)) return null
  const parsed = parseOrigin(origin)
  if (!parsed.ok) return null

  return { key, origin: parsed.origin, version }
}

/**
 * Records that a snippet was seen.
 *
 * An origin on the app's allowlist updates "last seen". One that is not gets
 * counted separately, so the portal can offer to add it. An unknown key is
 * ignored: this endpoint is public, and it should say as little as possible
 * about which keys exist.
 */
export async function recordPing(ping: Ping): Promise<PingOutcome> {
  const app = await getDb().app.findUnique({
    where: { publicKey: ping.key },
    select: { id: true, origins: true, lastSeenAt: true },
  })
  if (!app) return { status: 'ignored' }

  if (!isAllowedOrigin(app.origins, ping.origin)) {
    await getDb().originSighting.upsert({
      where: { appId_origin: { appId: app.id, origin: ping.origin } },
      update: { count: { increment: 1 }, lastSeenAt: new Date() },
      create: { appId: app.id, origin: ping.origin },
    })
    return { status: 'unknown-origin' }
  }

  const seenRecently =
    app.lastSeenAt !== null && Date.now() - app.lastSeenAt.getTime() < QUIET_PERIOD_MS
  if (!seenRecently) {
    await getDb().app.update({
      where: { id: app.id },
      data: { lastSeenAt: new Date(), lastSeenOrigin: ping.origin },
    })
  }

  return { status: 'recorded' }
}
