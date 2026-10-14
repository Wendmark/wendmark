import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { getDb } from '../db'
import { isAllowedOrigin } from '../apps/origins'
import { require as requirePermission } from '../permissions'

/**
 * One-time permission for the snippet in a customer's app to record flows.
 *
 * Deliberately short-lived, single use, and scoped to drafts: anything in a
 * customer's page can read what the page receives, so the protection is in
 * what a stolen token is worth, not in hiding it. See
 * docs/decisions/author-mode.md.
 */

/** A token is useful for a minute; it is redeemed within seconds. */
export const TOKEN_LIFETIME_MS = 60_000

/** How long an author session lasts once the token has been redeemed. */
export const SESSION_LIFETIME_MS = 60 * 60 * 1000

/**
 * A replay session is shorter: it reads one report, which takes a minute,
 * and following the steps takes a few more.
 */
export const REPLAY_SESSION_LIFETIME_MS = 15 * 60 * 1000

/** Only the hash is stored, so a leaked database cannot author anything. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** A token to hand to the snippet. Shown once, never stored in the clear. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Constant-time comparison, so timing cannot be used to guess a token. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export interface IssueInput {
  userId: string
  role: string | null
  organizationId: string | null
  appId: string
  /** The origin the author will be sent to. Must be one of the app's. */
  origin: string
}

export type IssueResult =
  { ok: true; token: string; expiresAt: Date; origin: string } | { ok: false; reason: string }

/** Issues a token for someone who may edit this app, and no one else. */
export async function issueAuthorToken(input: IssueInput): Promise<IssueResult> {
  requirePermission(input.role, 'flow:create')

  const app = await getDb().app.findFirst({
    where: { id: input.appId, organizationId: input.organizationId ?? '' },
    select: { id: true, origins: true },
  })
  if (!app) return { ok: false, reason: 'That app does not exist.' }

  if (!isAllowedOrigin(app.origins, input.origin)) {
    return { ok: false, reason: 'That address is not on the app’s list.' }
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS)

  await getDb().authorToken.create({
    data: {
      tokenHash: hashToken(token),
      appId: app.id,
      userId: input.userId,
      origin: input.origin,
      expiresAt,
    },
  })

  return { ok: true, token, expiresAt, origin: input.origin }
}

export interface AuthorSession {
  appId: string
  userId: string
  origin: string
  expiresAt: Date
}

/** A session that may replay one report, and do nothing else. */
export interface ReplaySession extends AuthorSession {
  reportId: string
}

export type RedeemResult =
  { ok: true; sessionToken: string; session: AuthorSession } | { ok: false; reason: string }

/**
 * Spends a token, once.
 *
 * Expired, already used, or redeemed from a different origin than it was
 * issued for: all refused with the same vague reason, so the endpoint says
 * nothing useful to someone guessing.
 */
export async function redeemAuthorToken(token: string, origin: string): Promise<RedeemResult> {
  const refused = { ok: false, reason: 'That authoring link is no longer valid.' } as const
  if (!token) return refused

  const record = await getDb().authorToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })
  if (!record) return refused
  if (record.usedAt) return refused
  if (record.expiresAt.getTime() < Date.now()) return refused
  if (record.origin !== origin) return refused

  // Marking used before anything else: a token is spent even if what follows
  // fails, so a replay cannot slip through.
  await getDb().authorToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  const sessionToken = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)

  await getDb().authorSession.create({
    data: {
      tokenHash: hashToken(sessionToken),
      appId: record.appId,
      userId: record.userId,
      origin: record.origin,
      expiresAt,
    },
  })

  return {
    ok: true,
    sessionToken,
    session: {
      appId: record.appId,
      userId: record.userId,
      origin: record.origin,
      expiresAt,
    },
  }
}

/**
 * Who a saved-draft request is coming from, or null.
 *
 * Sessions are rows rather than signed values, so rotating an app's key or
 * removing an origin can end them immediately. Only a recording session
 * counts: one approved to replay a report cannot save anything.
 */
export async function verifyAuthorSession(
  sessionToken: string,
  origin: string,
): Promise<AuthorSession | null> {
  const record = await findSession(sessionToken, origin, 'record')
  if (!record) return null

  return {
    appId: record.appId,
    userId: record.userId,
    origin: record.origin,
    expiresAt: record.expiresAt,
  }
}

/** Who a replay request is coming from, and which report it may read, or null. */
export async function verifyReplaySession(
  sessionToken: string,
  origin: string,
): Promise<ReplaySession | null> {
  const record = await findSession(sessionToken, origin, 'replay')
  if (!record?.reportId) return null

  return {
    appId: record.appId,
    userId: record.userId,
    origin: record.origin,
    expiresAt: record.expiresAt,
    reportId: record.reportId,
  }
}

/** A live session for this token, origin and purpose, marked as used, or null. */
async function findSession(sessionToken: string, origin: string, purpose: 'record' | 'replay') {
  if (!sessionToken) return null

  const record = await getDb().authorSession.findUnique({
    where: { tokenHash: hashToken(sessionToken) },
  })
  if (!record) return null
  if (record.expiresAt.getTime() < Date.now()) return null
  if (record.origin !== origin) return null
  if (record.purpose !== purpose) return null

  await getDb().authorSession.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  })
  return record
}

/** Ends every author session for an app, e.g. when its key is rotated. */
export async function revokeAuthorSessions(appId: string): Promise<void> {
  await getDb().authorSession.deleteMany({ where: { appId } })
}
