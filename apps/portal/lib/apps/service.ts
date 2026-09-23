import type { App } from '../../generated/prisma/client'
import { getDb } from '../db'
import { require as requirePermission } from '../permissions'
import { generatePublicKey } from './keys'
import { parseOrigins } from './origins'

/**
 * Who is asking, and where they are acting.
 *
 * Every read and write takes this and filters by the organization. One
 * organization exists today; the filtering is what keeps adding more a
 * switch rather than an audit of every query. See docs/decisions/auth.md.
 */
export interface Context {
  userId: string
  organizationId: string | null
  role: string | null
}

/** Something the caller asked for that is not theirs, or does not exist. */
export class NotFoundError extends Error {
  constructor() {
    super('Not found')
    this.name = 'NotFoundError'
  }
}

/** Something the caller got wrong, with a message worth showing them. */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidInputError'
  }
}

export async function listApps(ctx: Context): Promise<App[]> {
  requirePermission(ctx.role, 'app:read')
  if (!ctx.organizationId) return []
  return getDb().app.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * One app, or null. Null rather than an error for another organization's
 * app, so the portal cannot be used to discover that an id exists.
 */
export async function getApp(ctx: Context, appId: string): Promise<App | null> {
  requirePermission(ctx.role, 'app:read')
  if (!ctx.organizationId) return null
  return getDb().app.findFirst({ where: { id: appId, organizationId: ctx.organizationId } })
}

/** Addresses that used this app's key but are not on its allowlist. */
export async function listUnknownOrigins(
  ctx: Context,
  appId: string,
): Promise<{ origin: string; count: number; lastSeenAt: Date }[]> {
  requirePermission(ctx.role, 'app:read')
  const app = await getApp(ctx, appId)
  if (!app) return []

  const sightings = await getDb().originSighting.findMany({
    where: { appId: app.id },
    orderBy: { lastSeenAt: 'desc' },
    take: 10,
  })
  // An address may have been added to the allowlist since it was seen.
  return sightings
    .filter((sighting) => !app.origins.includes(sighting.origin))
    .map(({ origin, count, lastSeenAt }) => ({ origin, count, lastSeenAt }))
}

/** Adds an address that was seen using this app's key. */
export async function allowOrigin(ctx: Context, appId: string, origin: string): Promise<App> {
  requirePermission(ctx.role, 'app:update')
  const existing = await getApp(ctx, appId)
  if (!existing) throw new NotFoundError()

  const updated = await updateApp(ctx, appId, { origins: [...existing.origins, origin] })
  await getDb().originSighting.deleteMany({ where: { appId: existing.id, origin } })
  return updated
}

export async function createApp(
  ctx: Context,
  input: { name: string; origins: string[] },
): Promise<App> {
  requirePermission(ctx.role, 'app:create')
  if (!ctx.organizationId) throw new InvalidInputError('You are not part of an organization yet.')

  const name = input.name.trim()
  if (name === '') throw new InvalidInputError('Give the app a name.')

  const origins = parseOrigins(input.origins)
  if (!origins.ok) throw new InvalidInputError(origins.reason)

  return getDb().app.create({
    data: {
      organizationId: ctx.organizationId,
      name,
      origins: origins.origins,
      publicKey: generatePublicKey(),
    },
  })
}

export async function updateApp(
  ctx: Context,
  appId: string,
  input: { name?: string; origins?: string[] },
): Promise<App> {
  requirePermission(ctx.role, 'app:update')
  const existing = await getApp(ctx, appId)
  if (!existing) throw new NotFoundError()

  const data: { name?: string; origins?: string[] } = {}

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name === '') throw new InvalidInputError('Give the app a name.')
    data.name = name
  }

  if (input.origins !== undefined) {
    const origins = parseOrigins(input.origins)
    if (!origins.ok) throw new InvalidInputError(origins.reason)
    data.origins = origins.origins
  }

  return getDb().app.update({ where: { id: existing.id }, data })
}

/**
 * Issues a new key. The old one stops working at once, so any page still
 * serving the old script tag loses guidance until it is updated.
 */
export async function rotateKey(ctx: Context, appId: string): Promise<App> {
  requirePermission(ctx.role, 'app:rotate-key')
  const existing = await getApp(ctx, appId)
  if (!existing) throw new NotFoundError()

  return getDb().app.update({
    where: { id: existing.id },
    data: { publicKey: generatePublicKey() },
  })
}

/** Deletes an app and everything recorded for it. Not recoverable. */
export async function deleteApp(ctx: Context, appId: string, confirmation: string): Promise<void> {
  requirePermission(ctx.role, 'app:delete')
  const existing = await getApp(ctx, appId)
  if (!existing) throw new NotFoundError()

  // Typing the name is the confirmation: this cascades to every flow
  // recorded for the app.
  if (confirmation.trim() !== existing.name) {
    throw new InvalidInputError('Type the app name exactly to confirm.')
  }

  await getDb().app.delete({ where: { id: existing.id } })
}
