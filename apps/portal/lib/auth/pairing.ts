import { isAllowedOrigin } from '../apps/origins'
import { isPublicKey } from '../apps/keys'
import { getDb } from '../db'
import { require as requirePermission } from '../permissions'
import {
  REPLAY_SESSION_LIFETIME_MS,
  SESSION_LIFETIME_MS,
  generateToken,
  hashToken,
} from './author-tokens'

/**
 * Pairing: how a snippet gets permission to record, or to replay a report.
 *
 * The snippet invents a code and asks to record. The portal, where the
 * person is signed in, approves it. The code is useless on its own, nothing
 * secret goes through a URL, and no window has to talk to another window.
 * That last point matters: Cross-Origin-Opener-Policy severs window-to-window
 * messaging on many apps, and we do not control customers' headers.
 */

/** A request is worth approving for this long. */
export const PAIRING_LIFETIME_MS = 90_000

/**
 * What a snippet can ask for. Kept apart all the way through: a recording
 * session cannot read reports, and a replay session cannot save anything.
 */
export type PairingPurpose = 'record' | 'replay'

export function isPairingPurpose(value: unknown): value is PairingPurpose {
  return value === 'record' || value === 'replay'
}

/** Who may approve each purpose. */
const PERMISSION_FOR = { record: 'flow:create', replay: 'report:read' } as const

/** What an approval grants: recording, or replaying one report. */
export type Grant = { purpose: 'record' } | { purpose: 'replay'; reportId: string }

/** A code invented by a snippet, for it to collect its session with later. */
export function generatePairingCode(): string {
  return generateToken()
}

export type StartResult = { ok: true } | { ok: false }

/**
 * A snippet asking to record, or to replay.
 *
 * Deliberately says nothing useful back: this is a public endpoint, and the
 * answer must not reveal whether a key or an origin is real.
 */
export async function startPairing(input: {
  key: string
  origin: string
  code: string
  purpose?: PairingPurpose
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
      purpose: input.purpose ?? 'record',
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

/** Requests waiting for approval for one app and purpose, newest first. */
export async function listPendingPairings(
  ctx: { organizationId: string | null; role: string | null },
  appId: string,
  purpose: PairingPurpose = 'record',
): Promise<PendingRequest[]> {
  requirePermission(ctx.role, PERMISSION_FOR[purpose])

  const app = await getDb().app.findFirst({
    where: { id: appId, organizationId: ctx.organizationId ?? '' },
    select: { id: true },
  })
  if (!app) return []

  const requests = await getDb().pairingRequest.findMany({
    where: { appId: app.id, purpose, approved: false, expiresAt: { gt: new Date() } },
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
  grant: Grant = { purpose: 'record' },
): Promise<ApproveResult> {
  requirePermission(ctx.role, PERMISSION_FOR[grant.purpose])

  const app = await getDb().app.findFirst({
    where: { id: appId, organizationId: ctx.organizationId ?? '' },
    select: { id: true, origins: true },
  })
  if (!app) return { ok: false, reason: 'That app does not exist.' }

  const request = await getDb().pairingRequest.findFirst({
    where: {
      id: requestId,
      appId: app.id,
      purpose: grant.purpose,
      approved: false,
      expiresAt: { gt: new Date() },
    },
  })
  if (!request) return { ok: false, reason: 'That request has expired. Try again.' }

  // The address must still be one this app is allowed on: it may have been
  // removed since the request arrived.
  if (!isAllowedOrigin(app.origins, request.origin)) {
    return { ok: false, reason: 'That address is no longer on the app’s list.' }
  }

  // A replay may only read a report of this same app.
  if (grant.purpose === 'replay') {
    const report = await getDb().report.findFirst({
      where: { id: grant.reportId, appId: app.id },
      select: { id: true },
    })
    if (!report) return { ok: false, reason: 'That report does not exist any more.' }
  }

  const sessionToken = generateToken()
  const lifetime = grant.purpose === 'replay' ? REPLAY_SESSION_LIFETIME_MS : SESSION_LIFETIME_MS
  const expiresAt = new Date(Date.now() + lifetime)

  await getDb().authorSession.create({
    data: {
      tokenHash: hashToken(sessionToken),
      appId: app.id,
      userId: ctx.userId,
      origin: request.origin,
      purpose: grant.purpose,
      ...(grant.purpose === 'replay' ? { reportId: grant.reportId } : {}),
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
