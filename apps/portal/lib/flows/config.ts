import { createHash } from 'node:crypto'
import { SCHEMA_VERSION } from '@wendmark/core'
import { getDb } from '../db'
import { stepCount } from './list'
import { appliesTo } from './targeting'
import { readAppSettings } from '../apps/settings'

/**
 * What a snippet is told on page load.
 *
 * Metadata only: names and where they apply, never the steps. Most visitors
 * never start a process, and they should not download every step of every
 * one to find that out. The steps are fetched when a process is chosen.
 *
 * Nothing here describes a person. This endpoint is public to an app's
 * origins, and the response is the same for every visitor.
 */

export interface ConfigFlow {
  id: string
  name: string
  description: string | null
  steps: number
  /** Which version of this flow the snippet would be given. */
  version: number
  /**
   * Whether this process belongs on the page the snippet asked from.
   *
   * Sent rather than filtered on, so the launcher can lead with what is
   * useful here and still offer everything else. A process for another page
   * is worth showing: the player says where to go.
   */
  appliesHere: boolean
}

export interface Config {
  flows: ConfigFlow[]
  launcher: { enabled: boolean }
}

export interface ConfigQuery {
  /** The page the snippet is on, when it says. */
  url: string | null
  /** The flow format the snippet understands. Absent means the first one. */
  formatVersion: number
}

/** A snippet can only be served a format it understands. */
function canPlay(flowVersion: number, snippetUnderstands: number): boolean {
  return flowVersion <= snippetUnderstands
}

/** The format version to assume when a snippet does not say. */
export function readFormatVersion(raw: string | null): number {
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  // A snippet claiming to understand more than this portal can produce is
  // not a problem: it will be served what exists.
  return Math.min(parsed, SCHEMA_VERSION)
}

/**
 * The published processes an app's snippet may offer on this page.
 *
 * Drafts and paused processes are absent, not hidden: nothing about them
 * reaches the response. What is served is the newest published version,
 * never the row the author is editing.
 */
export async function buildConfig(appId: string, query: ConfigQuery): Promise<Config> {
  const app = await getDb().app.findUnique({ where: { id: appId }, select: { settings: true } })
  const settings = readAppSettings(app?.settings)

  const rows = await getDb().flow.findMany({
    where: {
      appId,
      deletedAt: null,
      status: 'published',
      visibility: 'listed',
    },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })

  const flows: ConfigFlow[] = []
  for (const row of rows) {
    const published = row.versions[0]
    // Published with no version cannot happen through the portal, but a row
    // edited by hand should be left out rather than served half-formed.
    if (!published) continue
    if (!canPlay(published.schemaVersion, query.formatVersion)) continue

    flows.push({
      id: row.id,
      name: published.name,
      description: published.description,
      steps: stepCount(published.steps),
      version: published.version,
      appliesHere: appliesTo(published.urlPatterns, query.url),
    })
  }

  return { flows, launcher: { enabled: settings.launcher } }
}

/**
 * A short fingerprint of a response, for `ETag`.
 *
 * The snippet asks on every page load; almost every answer is the one it
 * already has. An ETag turns that into a 304 with no body, and publishing
 * changes the fingerprint, so a new process appears on the next page load
 * rather than whenever a cache expires.
 */
export function configEtag(config: Config): string {
  const digest = createHash('sha256').update(JSON.stringify(config)).digest('hex')
  return `"${digest.slice(0, 32)}"`
}

/**
 * The published steps of one process, ready to play.
 *
 * Read from the frozen version, never from the row: an author editing while
 * someone is mid-process must not change what that person is being shown.
 * Returns null for anything not currently published — a draft, a paused
 * process, another app's, or one that never existed.
 */
export async function buildPlayableFlow(
  appId: string,
  flowId: string,
  formatVersion: number,
): Promise<unknown | null> {
  const flow = await getDb().flow.findFirst({
    where: { id: flowId, appId, deletedAt: null, status: 'published', visibility: 'listed' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })

  const published = flow?.versions[0]
  if (!published) return null
  if (!canPlay(published.schemaVersion, formatVersion)) return null

  return {
    schemaVersion: published.schemaVersion,
    id: flow.id,
    name: published.name,
    ...(published.description === null ? {} : { description: published.description }),
    steps: published.steps,
  }
}
