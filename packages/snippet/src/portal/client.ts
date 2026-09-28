import type { Flow } from '@wendmark/core'
import { SCHEMA_VERSION } from '@wendmark/core/guard'

/**
 * Asking the portal what this app has published.
 *
 * Every call here is optional to the page: a portal that is slow, down or
 * blocked must leave the host app exactly as it was. Nothing throws, nothing
 * retries in a loop, and nothing is awaited before the page can be used.
 */

/** One published process, as the config endpoint describes it. */
export interface FlowSummary {
  id: string
  name: string
  description: string | null
  steps: number
  /** Whether this process belongs on the page the snippet is on. */
  appliesHere: boolean
}

export interface PortalConfig {
  flows: FlowSummary[]
  launcher: { enabled: boolean; label: string }
}

/** What the launcher is called when an app has not said otherwise. */
export const DEFAULT_LAUNCHER_LABEL = 'How do I…'

const EMPTY: PortalConfig = {
  flows: [],
  launcher: { enabled: false, label: DEFAULT_LAUNCHER_LABEL },
}

/** A page load should not wait longer than this for guidance to be offered. */
const TIMEOUT_MS = 4_000

/** Gives up quietly, so a hanging portal cannot hang the page. */
async function get(url: string, view: Window): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = view.setTimeout(() => {
    controller.abort()
  }, TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    })
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    return null
  } finally {
    view.clearTimeout(timer)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Reads the config, keeping only what this snippet understands. */
function readConfig(value: unknown): PortalConfig {
  if (!isRecord(value) || !Array.isArray(value.flows)) return EMPTY

  const flows: FlowSummary[] = []
  for (const candidate of value.flows) {
    if (!isRecord(candidate)) continue
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue

    flows.push({
      id: candidate.id,
      name: candidate.name,
      description: typeof candidate.description === 'string' ? candidate.description : null,
      steps: typeof candidate.steps === 'number' ? candidate.steps : 0,
      // An older portal does not say; assume it belongs here rather than
      // hiding it in a section the user has to go looking in.
      appliesHere: candidate.appliesHere !== false,
    })
  }

  const launcher = isRecord(value.launcher) ? value.launcher : {}
  const label = typeof launcher.label === 'string' ? launcher.label.trim() : ''

  return {
    flows,
    launcher: {
      enabled: launcher.enabled === true,
      label: label === '' ? DEFAULT_LAUNCHER_LABEL : label,
    },
  }
}

/**
 * What this app has published, for the page the user is on.
 *
 * An unreachable portal is the same as an app with nothing published: no
 * guidance is offered, and nothing is said about it. There is nothing the
 * person browsing could do with the news.
 */
export async function fetchConfig(
  portalOrigin: string,
  key: string,
  view: Window,
): Promise<PortalConfig> {
  const url =
    `${portalOrigin}/api/v1/config?key=${encodeURIComponent(key)}` +
    `&v=${SCHEMA_VERSION}&url=${encodeURIComponent(view.location.pathname)}`

  return readConfig(await get(url, view))
}

/**
 * The steps of one process.
 *
 * Fetched when somebody chooses it, never in advance: most visitors never
 * start one. The caller checks the shape — this only reports what arrived.
 */
export async function fetchFlow(
  portalOrigin: string,
  key: string,
  flowId: string,
  view: Window,
): Promise<Flow | null> {
  const url =
    `${portalOrigin}/api/v1/flows/${encodeURIComponent(flowId)}` +
    `?key=${encodeURIComponent(key)}&v=${SCHEMA_VERSION}`

  const body = await get(url, view)
  return body === null ? null : (body as Flow)
}
