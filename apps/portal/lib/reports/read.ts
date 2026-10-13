import { getDb } from '../db'
import { InvalidInputError, NotFoundError, type Context } from '../apps/service'
import { require as requirePermission } from '../permissions'
import { purgeExpiredReports } from './write'

/**
 * Reading what end users reported, and forgetting it.
 *
 * The one place the portal shows an app's own customers' words. Every
 * query is scoped to the reader's organization, every function checks its
 * permission, and every read sweeps expired reports first: a report past
 * its retention date is one somebody was promised would be gone, so it must
 * not be shown even if nobody has written a new one since. See
 * docs/decisions/problem-reports.md.
 */

/** A report as the list shows it. */
export interface ReportSummary {
  id: string
  note: string
  steps: number
  pages: string[]
  userRef: string | null
  createdAt: Date
  expiresAt: Date
}

/** A report as its own page shows it. */
export interface ReportDetail extends ReportSummary {
  appId: string
  /** As stored. Read with readSteps() from ./view. */
  stepsJson: unknown
  labels: string
  origin: string
  userAgent: string | null
  snippetVersion: string | null
}

/** Never more than this in one list; the newest come first. */
const LIST_LIMIT = 200

/** Long enough for any identifier an app would pass, as in ReportSchema. */
const MAX_USER_REF = 200

function stepCount(raw: unknown): number {
  return Array.isArray(raw) ? raw.length : 0
}

/** The app, if it is in the reader's organization. */
async function ownApp(ctx: Context, appId: string): Promise<{ id: string } | null> {
  if (!ctx.organizationId) return null
  return getDb().app.findFirst({
    where: { id: appId, organizationId: ctx.organizationId },
    select: { id: true },
  })
}

/** An app's reports, newest first, optionally only one person's. */
export async function listReports(
  ctx: Context,
  appId: string,
  filter: { userRef?: string } = {},
): Promise<ReportSummary[]> {
  requirePermission(ctx.role, 'report:read')
  const app = await ownApp(ctx, appId)
  if (!app) return []

  await purgeExpiredReports()
  const rows = await getDb().report.findMany({
    where: { appId: app.id, ...(filter.userRef ? { userRef: filter.userRef } : {}) },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      note: true,
      steps: true,
      pages: true,
      userRef: true,
      createdAt: true,
      expiresAt: true,
    },
  })
  return rows.map(({ steps, ...row }) => ({ ...row, steps: stepCount(steps) }))
}

/** How many reports an app holds, for a count beside a link. */
export async function countReports(ctx: Context, appId: string): Promise<number> {
  requirePermission(ctx.role, 'report:read')
  const app = await ownApp(ctx, appId)
  if (!app) return 0
  return getDb().report.count({ where: { appId: app.id, expiresAt: { gt: new Date() } } })
}

/** One report, or null when it does not exist, has expired, or is not ours. */
export async function getReport(ctx: Context, reportId: string): Promise<ReportDetail | null> {
  requirePermission(ctx.role, 'report:read')
  if (!ctx.organizationId || !isUuid(reportId)) return null

  await purgeExpiredReports()
  const row = await getDb().report.findFirst({
    where: { id: reportId, app: { organizationId: ctx.organizationId } },
  })
  if (!row) return null
  return {
    id: row.id,
    appId: row.appId,
    note: row.note,
    steps: stepCount(row.steps),
    stepsJson: row.steps,
    pages: row.pages,
    userRef: row.userRef,
    labels: row.labels,
    origin: row.origin,
    userAgent: row.userAgent,
    snippetVersion: row.snippetVersion,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  }
}

/**
 * Deletes one report, now. A hard delete, like retention: a report somebody
 * chose to remove is not kept anywhere.
 */
export async function deleteReport(ctx: Context, reportId: string): Promise<{ appId: string }> {
  requirePermission(ctx.role, 'report:delete')
  if (!ctx.organizationId || !isUuid(reportId)) throw new NotFoundError()

  const row = await getDb().report.findFirst({
    where: { id: reportId, app: { organizationId: ctx.organizationId } },
    select: { id: true, appId: true },
  })
  if (!row) throw new NotFoundError()

  await getDb().report.delete({ where: { id: row.id } })
  return { appId: row.appId }
}

/**
 * Deletes everything one person sent to this app: the answer to "delete
 * what you have about me". Only possible for reports the app tagged with a
 * `userRef`; it is matched exactly, never interpreted.
 */
export async function eraseReportsFrom(
  ctx: Context,
  appId: string,
  userRef: string,
): Promise<number> {
  requirePermission(ctx.role, 'report:erase-person')
  const ref = userRef.trim()
  if (ref === '' || ref.length > MAX_USER_REF) {
    throw new InvalidInputError('Say whose reports to delete.')
  }
  const app = await ownApp(ctx, appId)
  if (!app) throw new NotFoundError()

  const { count } = await getDb().report.deleteMany({ where: { appId: app.id, userRef: ref } })
  return count
}

/** Report ids are UUIDs; anything else cannot be one, so is not looked up. */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
