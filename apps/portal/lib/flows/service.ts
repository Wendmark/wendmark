import { FlowSchema, type Flow, type Step } from '@wendmark/core'
import type { FlowStatus } from '../../generated/prisma/client'
import { getDb } from '../db'
import type { AuthorSession } from '../auth/author-tokens'
import type { Context } from '../apps/service'
import { InvalidInputError, NotFoundError } from '../apps/service'
import { require as requirePermission } from '../permissions'
import { canPause, canResume, copyName, stepCount } from './list'
import { addNote, moveStep, removeStep, retitleStep, setDynamic } from './edit'
import { parsePatterns } from './targeting'
import {
  hasUnpublishedChanges,
  nextVersion,
  publishState,
  type PublishState,
  type Snapshot,
} from './versions'

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
  /** How this flow stands relative to what users are being served. */
  publishing: PublishState
  /** Whether publishing now would change what users see. */
  needsPublish: boolean
  /** Whether the launcher offers it, or only an app asking by id can. */
  listed: boolean
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
    // The order an author arranged, and within that the newest change
    // first, so a fresh recording is not buried at the bottom.
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: {
      createdBy: { select: { name: true, email: true } },
      // Only the newest version matters here: it is what users are served.
      versions: { orderBy: { version: 'desc' }, take: 1 },
    },
  })

  return rows.map((row) => {
    const latest = row.versions[0] ?? null
    const changed = hasUnpublishedChanges(snapshotOf(row), latest ? snapshotOf(latest) : null)
    const publishing = publishState(latest !== null, changed)

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      steps: stepCount(row.steps),
      updatedAt: row.updatedAt,
      recordedBy: row.createdBy?.name ?? row.createdBy?.email ?? null,
      publishing,
      // A paused flow is hidden on purpose; publishing is not the fix.
      needsPublish: changed && row.status !== 'paused',
      listed: row.visibility === 'listed',
    }
  })
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

/** The flow as it stands, in the shape a published version freezes. */
function snapshotOf(flow: {
  name: string
  description: string | null
  steps: unknown
  schemaVersion: number
  urlPatterns: string[]
}): Snapshot {
  return {
    name: flow.name,
    description: flow.description,
    steps: flow.steps,
    schemaVersion: flow.schemaVersion,
    urlPatterns: flow.urlPatterns,
  }
}

/**
 * Freezes the flow as it stands and shows it to users.
 *
 * The version is a copy, not a pointer: from here on the author edits the
 * row and users keep seeing the copy, until this is called again. That is
 * what stops an edit reaching somebody halfway through a process.
 */
export async function publishFlow(ctx: Context, flowId: string): Promise<{ version: number }> {
  requirePermission(ctx.role, 'flow:publish')
  const flow = await own(ctx, flowId)

  if (stepCount(flow.steps) === 0) {
    throw new InvalidInputError('A process needs at least one step before it can be published.')
  }

  const versions = await getDb().flowVersion.findMany({
    where: { flowId: flow.id },
    select: { version: true },
  })
  const version = nextVersion(versions)

  await getDb().flowVersion.create({
    data: {
      flowId: flow.id,
      version,
      name: flow.name,
      ...(flow.description === null ? {} : { description: flow.description }),
      steps: flow.steps === null ? [] : flow.steps,
      schemaVersion: flow.schemaVersion,
      urlPatterns: flow.urlPatterns,
      publishedById: ctx.userId,
    },
  })

  await getDb().flow.update({ where: { id: flow.id }, data: { status: 'published' } })
  return { version }
}

/**
 * Takes a process back to a draft.
 *
 * Published versions are left alone: they are the record of what users were
 * shown, and deleting them would make the history a lie. Nothing serves them
 * once the flow is a draft again.
 */
export async function unpublishFlow(ctx: Context, flowId: string): Promise<void> {
  requirePermission(ctx.role, 'flow:publish')
  const flow = await own(ctx, flowId)
  if (flow.status === 'draft') return

  await getDb().flow.update({ where: { id: flow.id }, data: { status: 'draft' } })
}

/**
 * Puts an earlier version back in front of users.
 *
 * It copies that version's content onto the flow and publishes it as a new
 * version, rather than moving a pointer backwards. The history stays a list
 * of what was shown and when, which is the point of keeping it.
 */
export async function restoreVersion(
  ctx: Context,
  flowId: string,
  versionId: string,
): Promise<{ version: number }> {
  requirePermission(ctx.role, 'flow:publish')
  const flow = await own(ctx, flowId)

  const old = await getDb().flowVersion.findFirst({ where: { id: versionId, flowId: flow.id } })
  if (!old) throw new NotFoundError()

  await getDb().flow.update({
    where: { id: flow.id },
    data: {
      name: old.name,
      description: old.description,
      steps: old.steps === null ? [] : old.steps,
      schemaVersion: old.schemaVersion,
      urlPatterns: old.urlPatterns,
    },
  })

  return publishFlow(ctx, flow.id)
}

export interface VersionSummary {
  id: string
  version: number
  name: string
  steps: number
  publishedAt: Date
  publishedBy: string | null
  isLive: boolean
}

/** What has been published for this flow, newest first. */
export async function listVersions(ctx: Context, flowId: string): Promise<VersionSummary[]> {
  requirePermission(ctx.role, 'flow:read')
  const flow = await getFlow(ctx, flowId)
  if (!flow) return []

  const rows = await getDb().flowVersion.findMany({
    where: { flowId: flow.id },
    orderBy: { version: 'desc' },
    include: { publishedBy: { select: { name: true, email: true } } },
  })

  const live = flow.status !== 'draft'
  return rows.map((row, index) => ({
    id: row.id,
    version: row.version,
    name: row.name,
    steps: stepCount(row.steps),
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy?.name ?? row.publishedBy?.email ?? null,
    // The newest version is what users are served, and only while the flow
    // is not back to a draft.
    isLive: live && index === 0,
  }))
}

/** Whether the draft says something users are not being shown yet. */
export async function publishingState(ctx: Context, flowId: string): Promise<PublishState> {
  requirePermission(ctx.role, 'flow:read')
  const flow = await getFlow(ctx, flowId)
  if (!flow) return 'never-published'

  const latest = await getDb().flowVersion.findFirst({
    where: { flowId: flow.id },
    orderBy: { version: 'desc' },
  })

  const changed = hasUnpublishedChanges(snapshotOf(flow), latest ? snapshotOf(latest) : null)
  return publishState(latest !== null, changed)
}

/**
 * Applies a change to a process's steps.
 *
 * The steps are read back through the schema first, so an edit can never
 * turn a valid process into an invalid one by building on something the
 * portal did not understand. It edits the draft, never a published version:
 * what users see changes when somebody publishes, not when somebody types.
 */
async function editSteps(
  ctx: Context,
  flowId: string,
  change: (steps: Step[]) => Step[],
): Promise<void> {
  requirePermission(ctx.role, 'flow:update')
  const flow = await own(ctx, flowId)

  const parsed = FlowSchema.shape.steps.safeParse(flow.steps)
  if (!parsed.success) {
    throw new InvalidInputError(
      'These steps were not written in a format this portal understands, so they cannot be edited here.',
    )
  }

  const next = change(parsed.data)
  await getDb().flow.update({ where: { id: flow.id }, data: { steps: next } })
}

/** Rewrites what a step tells the user. */
export async function retitleFlowStep(
  ctx: Context,
  flowId: string,
  stepId: string,
  text: string,
): Promise<void> {
  await editSteps(ctx, flowId, (steps) => retitleStep(steps, stepId, text))
}

/** Moves a step earlier or later in the process. */
export async function moveFlowStep(
  ctx: Context,
  flowId: string,
  stepId: string,
  direction: -1 | 1,
): Promise<void> {
  await editSteps(ctx, flowId, (steps) => moveStep(steps, stepId, direction))
}

/** Drops a step: a misclick, or something the user should not be told. */
export async function removeFlowStep(ctx: Context, flowId: string, stepId: string): Promise<void> {
  await editSteps(ctx, flowId, (steps) => removeStep(steps, stepId))
}

/** Marks a step as pointing at the user's own data, or not. */
export async function setFlowStepDynamic(
  ctx: Context,
  flowId: string,
  stepId: string,
  dynamic: boolean,
): Promise<void> {
  await editSteps(ctx, flowId, (steps) => setDynamic(steps, stepId, dynamic))
}

/** Adds something for the user to read, after a given step. */
export async function addFlowNote(
  ctx: Context,
  flowId: string,
  text: string,
  afterId: string | null,
): Promise<void> {
  await editSteps(ctx, flowId, (steps) => addNote(steps, text, afterId))
}

/** Renames a process, and rewrites the sentence under its name. */
export async function renameFlow(
  ctx: Context,
  flowId: string,
  name: string,
  description: string,
): Promise<void> {
  requirePermission(ctx.role, 'flow:update')
  const flow = await own(ctx, flowId)

  const trimmed = name.trim()
  if (trimmed === '') throw new InvalidInputError('Give the process a name.')
  if (trimmed.length > 200) throw new InvalidInputError('That name is too long.')

  const summary = description.trim().slice(0, 2000)
  await getDb().flow.update({
    where: { id: flow.id },
    data: { name: trimmed, description: summary === '' ? null : summary },
  })
}

/**
 * Where a process offers itself.
 *
 * No rules means everywhere, which is what a recording gets by default and
 * what most processes want. Rules are paths, so the same process works on
 * localhost, staging and production.
 */
export async function setUrlPatterns(ctx: Context, flowId: string, raws: string[]): Promise<void> {
  requirePermission(ctx.role, 'flow:update')
  const flow = await own(ctx, flowId)

  const parsed = parsePatterns(raws)
  if (!parsed.ok) throw new InvalidInputError(parsed.reason)

  await getDb().flow.update({ where: { id: flow.id }, data: { urlPatterns: parsed.patterns } })
}

/**
 * Whether a process is offered in the launcher.
 *
 * Hidden is not private: the process still plays when an app asks for it by
 * id, which is the point — it is for processes an app links to from its own
 * interface, at the moment they are relevant.
 */
export async function setVisibility(ctx: Context, flowId: string, listed: boolean): Promise<void> {
  requirePermission(ctx.role, 'flow:update')
  const flow = await own(ctx, flowId)

  await getDb().flow.update({
    where: { id: flow.id },
    data: { visibility: listed ? 'listed' : 'hidden' },
  })
}

/**
 * Moves a process up or down the launcher's list.
 *
 * Positions are renumbered from the current order each time, because rows
 * created before this existed all sit at zero and would otherwise never
 * separate.
 */
export async function moveFlowInList(
  ctx: Context,
  appId: string,
  flowId: string,
  direction: -1 | 1,
): Promise<void> {
  requirePermission(ctx.role, 'flow:update')

  // The same order listFlows shows, tie-breaker included. Rows start at
  // sortOrder 0, so a different tie-breaker here would renumber an order
  // nobody is looking at and scramble the list on the first move.
  const flows = await getDb().flow.findMany({
    where: { appId, deletedAt: null, app: { organizationId: ctx.organizationId ?? '' } },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: { id: true },
  })

  const from = flows.findIndex((flow) => flow.id === flowId)
  if (from === -1) throw new NotFoundError()

  const to = from + direction
  if (to < 0 || to >= flows.length) return

  const order = flows.map((flow) => flow.id)
  const [moving] = order.splice(from, 1)
  if (!moving) return
  order.splice(to, 0, moving)

  await getDb().$transaction(
    order.map((id, index) => getDb().flow.update({ where: { id }, data: { sortOrder: index } })),
  )
}
