import type { Flow } from '@wendmark/core'
import type { FlowStatus } from '../../generated/prisma/client'
import { getDb } from '../db'
import type { AuthorSession } from '../auth/author-tokens'
import type { Context } from '../apps/service'
import { NotFoundError } from '../apps/service'
import { require as requirePermission } from '../permissions'
import { canPause, canResume, copyName, stepCount } from './list'

/**
 * Storing what author mode recorded.
 *
 * An author session can only ever create a draft. Publishing happens in the
 * portal, where a person is signed in and can see what they are publishing —
 * see docs/decisions/author-mode.md. Nothing in this file writes a status.
 */

export interface SavedDraft {
  id: string
  name: string
}

/**
 * Saves a recording as a draft of the session's app.
 *
 * The flow's own id is ignored: it was invented in the browser, and the
 * portal decides what a saved process is called. The app is taken from the
 * session, never from the request, so a session cannot write into another
 * app.
 */
export async function saveAuthorDraft(session: AuthorSession, flow: Flow): Promise<SavedDraft> {
  const created = await getDb().flow.create({
    data: {
      appId: session.appId,
      name: flow.name,
      ...(flow.description === undefined ? {} : { description: flow.description }),
      steps: flow.steps,
      schemaVersion: flow.schemaVersion,
      urlPatterns: [],
      createdById: session.userId,
    },
    select: { id: true, name: true },
  })

  return created
}

export interface FlowSummary {
  id: string
  name: string
  description: string | null
  status: FlowStatus
  steps: number
  updatedAt: Date
  recordedBy: string | null
}

/**
 * Every process recorded for an app, newest change first.
 *
 * Deleted processes are left out: they are kept so a deletion can be undone,
 * not so they clutter the list.
 */
export async function listFlows(ctx: Context, appId: string): Promise<FlowSummary[]> {
  requirePermission(ctx.role, 'flow:read')
  if (!ctx.organizationId) return []

  const rows = await getDb().flow.findMany({
    where: { appId, deletedAt: null, app: { organizationId: ctx.organizationId } },
    orderBy: { updatedAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    steps: stepCount(row.steps),
    updatedAt: row.updatedAt,
    recordedBy: row.createdBy?.name ?? row.createdBy?.email ?? null,
  }))
}

/** One process with its steps, or null if it is not this organization's. */
export async function getFlow(ctx: Context, flowId: string) {
  requirePermission(ctx.role, 'flow:read')
  if (!ctx.organizationId) return null

  return getDb().flow.findFirst({
    where: { id: flowId, deletedAt: null, app: { organizationId: ctx.organizationId } },
    include: { createdBy: { select: { name: true, email: true } } },
  })
}

/** The row, if the caller is allowed to have it. Throws rather than returns. */
async function own(ctx: Context, flowId: string) {
  const flow = await getDb().flow.findFirst({
    where: { id: flowId, deletedAt: null, app: { organizationId: ctx.organizationId ?? '' } },
  })
  if (!flow) throw new NotFoundError()
  return flow
}

/**
 * Copies a process, always as a draft.
 *
 * A copy of a published process must not go live by itself — it is a
 * starting point for an edit, and publishing it is a separate decision.
 */
export async function duplicateFlow(ctx: Context, flowId: string): Promise<{ id: string }> {
  requirePermission(ctx.role, 'flow:create')
  const flow = await own(ctx, flowId)

  const siblings = await getDb().flow.findMany({
    where: { appId: flow.appId, deletedAt: null },
    select: { name: true },
  })

  return getDb().flow.create({
    data: {
      appId: flow.appId,
      name: copyName(
        flow.name,
        siblings.map((sibling) => sibling.name),
      ),
      ...(flow.description === null ? {} : { description: flow.description }),
      steps: flow.steps === null ? [] : flow.steps,
      schemaVersion: flow.schemaVersion,
      urlPatterns: flow.urlPatterns,
      visibility: flow.visibility,
      createdById: ctx.userId,
    },
    select: { id: true },
  })
}

/**
 * Hides a published process from users, or shows it again.
 *
 * Pausing is not deleting and not unpublishing: the process keeps its place
 * and can come back with one click, which is what someone wants when a
 * process is briefly wrong.
 */
export async function setPaused(ctx: Context, flowId: string, paused: boolean): Promise<void> {
  requirePermission(ctx.role, 'flow:publish')
  const flow = await own(ctx, flowId)

  const allowed = paused ? canPause(flow.status) : canResume(flow.status)
  if (!allowed) return

  await getDb().flow.update({
    where: { id: flow.id },
    data: { status: paused ? 'paused' : 'published' },
  })
}

/**
 * Removes a process from the portal and from users.
 *
 * A soft delete: the row stays, so a process recorded over an afternoon is
 * not lost to a misplaced click. Nothing reads a deleted flow.
 */
export async function deleteFlow(ctx: Context, flowId: string): Promise<{ appId: string }> {
  requirePermission(ctx.role, 'flow:delete')
  const flow = await own(ctx, flowId)

  await getDb().flow.update({ where: { id: flow.id }, data: { deletedAt: new Date() } })
  return { appId: flow.appId }
}
