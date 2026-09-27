/**
 * @wendmark/snippet — the script customers embed. Bundled to a single IIFE
 * exposing one global, `window.Wendmark`. Depends on @wendmark/core and
 * @wendmark/dom only.
 *
 * Wendmark guides; it never acts. Nothing here clicks, types or navigates
 * for the user.
 */
import type { Flow } from '@wendmark/core'
// Imported from its own entry point: pulling it from the package root would
// bundle zod (about 95 KB gzipped) into the snippet.
import { checkFlow, looksLikeFlow } from '@wendmark/core/guard'
import { startFlow, type Player } from './player/player'
import { clearProgress, loadProgress } from './player/progress'
import { startAuthorModeIfAsked } from './author/start'
import { appKey, portalOrigin, sendInstallPing } from './install/ping'
import { startRecording, type Recording, type RecordingOptions } from './recorder/recorder'
import { fetchConfig, fetchFlow, type FlowSummary } from './portal/client'
import { createOverlay } from './overlay/overlay'
import { openLauncher as openLauncherPanel, type Launcher } from './launcher/launcher'
import { createOpenerButton, type OpenerButton } from './launcher/button'
import { loadCompleted, markCompleted } from './launcher/state'

export type { Flow }
export type { FlowSummary } from './portal/client'
export { createHighlighter, type Highlighter } from './overlay/highlighter'
export { OVERLAY_TAG } from './overlay/overlay'
export { prefersReducedMotion } from './overlay/cursor'

// Handy while authoring flows by hand, before the recorder exists.
export { fingerprint, findInteractiveTarget, resolve } from '@wendmark/dom'

export const version = '0.0.0'

// Tell the portal the snippet is installed, so its page can stop saying
// "waiting". Fire and forget: nothing here blocks the host page.
sendInstallPing(document, window, version)

// If the portal sent someone here to record a process, pick that up. A
// visitor who was not sent by the portal never notices any of this.
void startAuthorModeIfAsked(document, window, {
  startFlow: start,
  stopFlow: stop,
  startRecording,
})

// Someone who was halfway through a process before this page loaded should
// still be halfway through it. Costs a request only when there is progress
// to pick up.
void resumeFromPortal()

// Show the launcher button, if this app asked for one.
void mountLauncherIfEnabled()

/** Only one flow is guided at a time. */
let current: Player | null = null

/** Only one recording at a time, too. */
let currentRecording: Recording | null = null

/**
 * Starts recording the user's clicks as a flow. A badge is shown the whole
 * time, and nothing the user types is ever recorded.
 */
export function record(options: RecordingOptions = {}): void {
  stop()
  currentRecording?.stop()
  currentRecording = startRecording(options)
}

/** Stops recording and hands back the flow, or null when nothing was being recorded. */
export function stopRecording(): Flow | null {
  const recording = currentRecording
  currentRecording = null
  return recording ? recording.stop() : null
}

/**
 * Starts guiding the user through a process.
 *
 * Given a flow, it starts at once. Given the id of a published process, it
 * fetches the steps from the portal first and answers with a player, or with
 * null when that process is not available — unpublished, or the portal could
 * not be reached.
 */
export function start(flow: Flow, options?: { onEnd?: () => void }): Player
export function start(flowId: string, options?: { onEnd?: () => void }): Promise<Player | null>
export function start(
  flow: Flow | string,
  options: { onEnd?: () => void } = {},
): Player | Promise<Player | null> {
  if (typeof flow === 'string') return startById(flow, options)
  return startNow(flow, options)
}

/** Fetches a published process, then guides it. */
async function startById(flowId: string, options: { onEnd?: () => void }): Promise<Player | null> {
  const portal = portalOrigin(document)
  const key = appKey(document)
  if (!portal || !key) return null

  const fetched = await fetchFlow(portal, key, flowId, window)
  if (!fetched || checkFlow(fetched) !== 'ok') return null

  return startNow(fetched, options)
}

/**
 * Every published process this app offers on this page.
 *
 * An empty list when the portal cannot be reached: an app asking what to
 * offer should get an answer, not an exception.
 */
export async function listFlows(): Promise<FlowSummary[]> {
  const portal = portalOrigin(document)
  const key = appKey(document)
  if (!portal || !key) return []

  return (await fetchConfig(portal, key, window)).flows
}

function startNow(flow: Flow, options: { onEnd?: () => void } = {}): Player {
  const verdict = checkFlow(flow)
  if (verdict === 'too-new') {
    // Worth its own message: nothing is wrong with the flow, this copy of
    // the snippet is simply older than the flow it was given. A reload
    // fetches a newer one.
    throw new Error(
      'Wendmark: this process was made with a newer version of Wendmark than the one on this page.',
    )
  }
  if (verdict !== 'ok') {
    throw new Error('Wendmark: this flow does not have the shape of a playable flow.')
  }

  stop()
  current = startFlow(flow, {
    onFinish: () => {
      current = null
      markCompleted(safeLocalStorage(), flow.id)
      options.onEnd?.()
    },
    onStop: () => {
      current = null
      options.onEnd?.()
    },
  })
  return current
}

/**
 * Picks a flow up where the user left off, after a page load. The app passes
 * the flows it knows about; only the flow's id and the step number are
 * remembered between pages.
 */
export function resume(flows: Flow | Flow[]): Player | null {
  const storage = safeSessionStorage()
  const progress = loadProgress(storage)
  if (!progress) return null

  const available = Array.isArray(flows) ? flows : [flows]
  const flow = available.find((candidate) => candidate.id === progress.flowId)

  // Not among the flows this caller happens to hold. That is not evidence
  // the process is gone — it may be one the portal serves — so the progress
  // is left alone for whoever does know about it.
  if (!flow) return null

  // Edited into a different shape since: forget it rather than guessing
  // which step the user meant.
  if (!looksLikeFlow(flow) || progress.stepIndex >= flow.steps.length) {
    clearProgress(storage)
    return null
  }

  stop()
  current = startFlow(flow, {
    startIndex: progress.stepIndex,
    onFinish: () => {
      current = null
    },
    onStop: () => {
      current = null
    },
  })
  return current
}

/**
 * Picks up where the user left off, fetching the process from the portal.
 *
 * This is what makes guidance survive a page change without the app doing
 * anything: the id and step number were remembered, and the steps come back
 * from the portal. Silent about every failure — a person who was not
 * mid-process must see nothing at all.
 */
export async function resumeFromPortal(): Promise<Player | null> {
  const storage = safeSessionStorage()
  const progress = loadProgress(storage)
  if (!progress) return null

  const portal = portalOrigin(document)
  const key = appKey(document)
  if (!portal || !key) return null

  const flow = await fetchFlow(portal, key, progress.flowId, window)
  // Unpublished since, or edited into a different shape: forget it rather
  // than guessing which step the person meant.
  if (!flow || checkFlow(flow) !== 'ok' || progress.stepIndex >= flow.steps.length) {
    clearProgress(storage)
    return null
  }

  return resume(flow)
}

/** The launcher's own overlay, separate from the one guidance draws in. */
let launcherOverlay: { root: ShadowRoot; destroy: () => void } | null = null
let launcherPanel: Launcher | null = null
let opener: OpenerButton | null = null

/** The page's local storage, or undefined where the browser refuses it. */
function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/**
 * Opens the "How do I…" panel.
 *
 * Meant to be called from an app's own help menu. Nothing opens it by
 * itself unless the app turned the button on in the portal.
 */
export async function openLauncher(): Promise<void> {
  if (launcherPanel) return

  const flows = await listFlows()
  const progress = loadProgress(safeSessionStorage())

  const overlay = launcherOverlay ?? createOverlay(document)
  launcherOverlay = overlay
  opener?.setHidden(true)

  launcherPanel = openLauncherPanel(overlay.root, document, flows, {
    unfinishedId: progress?.flowId ?? null,
    completedIds: loadCompleted(safeLocalStorage()),
    onChoose: (flowId) => {
      launcherPanel = null
      opener?.setHidden(false)
      void start(flowId)
    },
  })
}

/** Closes the launcher, if it is open. */
export function closeLauncher(): void {
  launcherPanel?.close()
  launcherPanel = null
  opener?.setHidden(false)
}

/**
 * Shows Wendmark's own launcher button, when the app asked for one.
 *
 * Off unless the portal says otherwise, so an app that never opts in never
 * has anything added to its interface.
 */
async function mountLauncherIfEnabled(): Promise<void> {
  const portal = portalOrigin(document)
  const key = appKey(document)
  if (!portal || !key) return

  const config = await fetchConfig(portal, key, window)
  if (!config.launcher.enabled) return

  const overlay = launcherOverlay ?? createOverlay(document)
  launcherOverlay = overlay
  opener = createOpenerButton(overlay.root, document, () => {
    void openLauncher()
  })
}

/** Stops the flow being guided, if any. Keeps progress only when asked. */
export function stop(options: { keepProgress?: boolean } = {}): void {
  const player = current
  current = null
  player?.stop(options)
}

/** The page's session storage, or undefined where the browser refuses it. */
function safeSessionStorage(): Storage | undefined {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}
