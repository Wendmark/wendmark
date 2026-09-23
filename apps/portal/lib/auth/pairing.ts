import { isAllowedOrigin } from '../apps/origins'
import { isPublicKey } from '../apps/keys'
import { getDb } from '../db'
import { require as requirePermission } from '../permissions'
import { SESSION_LIFETIME_MS, generateToken, hashToken } from './author-tokens'

/**
 * Pairing: how a snippet gets permission to record.
 *
 * The snippet invents a code and asks to record. The portal, where the
 * person is signed in, approves it. The code is useless on its own, nothing
 * secret goes through a URL, and no window has to talk to another window.
 * That last point matters: Cross-Origin-Opener-Policy severs window-to-window
 * messaging on many apps, and we do not control customers' headers.
 */

/** A request is worth approving for this long. */
export const PAIRING_LIFETIME_MS = 90_000

/** A code invented by a snippet, for it to collect its session with later. */
export function generatePairingCode(): string {
  return generateToken()
}

export type StartResult = { ok: true } | { ok: false }

/**
 * A snippet asking to record.
 *
 * Deliberately says nothing useful back: this is a public endpoint, and the
 * answer must not reveal whether a key or an origin is real.
 */
export async function startPairing(input: {
  key: string
  origin: string
  code: string
}): Promise<StartResult> {
  if (!isPublicKey(input.key) || !input.code) return { ok: false }

  const app = await getDb().app.findUnique({
    where: { publicKey: input.key },
    select: { id: true, origins: true },
  })
  if (!app || !isAllowedOrigin(app.origins, input.origin)) return { ok: false }

  await getDb().pairingRequest.deleteMany({ where: { expiresAt: { lt: new Date() } } })

  await getDb().pairingRequest.create({
    data: {
      codeHash: hashToken(input.code),
      appId: app.id,
      origin: input.origin,
      expiresAt: new Date(Date.now() + PAIRING_LIFETIME_MS),
    },
  })

  return { ok: true }
}

export interface PendingRequest {
  id: string
  origin: string
  createdAt: Date
}

/** Requests waiting for approval for one app, newest first. */
export async function listPendingPairings(
  ctx: { organizationId: string | null; role: string | null },
  appId: string,
): Promise<PendingRequest[]> {
  requirePermission(ctx.role, 'flow:create')

  const app = await getDb().app.findFirst({
    where: { id: appId, organizationId: ctx.organizationId ?? '' },
    select: { id: true },
  })
  if (!app) return []

  const requests = await getDb().pairingRequest.findMany({
    where: { appId: app.id, approved: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return requests.map(({ id, origin, createdAt }) => ({ id, origin, createdAt }))
}

export type ApproveResult = { ok: true; origin: string } | { ok: false; reason: string }

/**
 * Approves a waiting request, which is what actually grants permission.
 *
 * The person doing this is signed into the portal, which is the only place
 * Wendmark knows who anyone is. The snippet's code proves nothing by itself.
 */
export async function approvePairing(
  ctx: { userId: string; organizationId: string | null; role: string | null },
  appId: string,
  requestId: string,
): Promise<ApproveResult> {
  requirePermission(ctx.role, 'flow:create')

  const app = await getDb().app.findFirst({
    where: { id: appId, organizationId: ctx.organizationId ?? '' },
    select: { id: true, origins: true },
  })
  if (!app) return { ok: false, reason: 'That app does not exist.' }

  const request = await getDb().pairingRequest.findFirst({
    where: { id: requestId, appId: app.id, approved: false, expiresAt: { gt: new Date() } },
  })
  if (!request) return { ok: false, reason: 'That request has expired. Try recording again.' }

  // The address must still be one this app is allowed on: it may have been
  // removed since the request arrived.
  if (!isAllowedOrigin(app.origins, request.origin)) {
    return { ok: false, reason: 'That address is no longer on the app’s list.' }
  }

  const sessionToken = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)

  await getDb().authorSession.create({
    data: {
      tokenHash: hashToken(sessionToken),
      appId: app.id,
      userId: ctx.userId,
      origin: request.origin,
      expiresAt,
    },
  })

  await getDb().pairingRequest.update({
    where: { id: request.id },
    data: { approved: true, sessionToken, approvedById: ctx.userId },
  })

  return { ok: true, origin: request.origin }
}

export type CollectResult =
  { ok: true; sessionToken: string; appId: string; expiresAt: string } | { ok: false }

/**
 * The snippet collecting its session, once.
 *
 * The row is deleted on collection, so the session token exists in the
 * database only between approval and pickup — seconds, normally.
 */
export async function collectPairing(code: string, origin: string): Promise<CollectResult> {
  if (!code) return { ok: false }

  const request = await getDb().pairingRequest.findUnique({
    where: { codeHash: hashToken(code) },
  })
  if (!request) return { ok: false }
  if (request.origin !== origin) return { ok: false }
  if (request.expiresAt.getTime() < Date.now()) return { ok: false }
  if (!request.approved || !request.sessionToken) return { ok: false }

  const session = await getDb().authorSession.findFirst({
    where: { tokenHash: hashToken(request.sessionToken) },
    select: { expiresAt: true },
  })

  await getDb().pairingRequest.delete({ where: { id: request.id } })

  return {
    ok: true,
    sessionToken: request.sessionToken,
    appId: request.appId,
    expiresAt: (session?.expiresAt ?? new Date()).toISOString(),
  }
}
