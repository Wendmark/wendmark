/**
 * Raw recording types + storage helpers, shared by the content script
 * (which appends clicks) and the popup (which starts/stops/saves).
 */

export interface RawClick {
  selector: string
  /** Visible text — never an input's value. */
  text: string
  role: string
  /** Accessible name (aria-label, associated label, etc.). */
  name: string
  /** Stable (non-generated) class names on the element. */
  classes: string[]
  /** Compact descriptions of the ancestor chain, innermost first. */
  ancestors: string[]
  /** Nearest section heading / labeled container text. */
  context: string
  url: string
  at: number
}

export interface ActiveRecording {
  startedAt: number
  clicks: RawClick[]
}

export interface RawRecording {
  id: string
  name: string
  createdAt: number
  clicks: RawClick[]
}

const ACTIVE_KEY = 'wend:activeRecording'
const RECORDINGS_KEY = 'wend:rawRecordings'

export async function getActiveRecording(): Promise<ActiveRecording | null> {
  const result = await chrome.storage.local.get(ACTIVE_KEY)
  return (result[ACTIVE_KEY] as ActiveRecording | undefined) ?? null
}

export async function startRecording(): Promise<void> {
  const active: ActiveRecording = { startedAt: Date.now(), clicks: [] }
  await chrome.storage.local.set({ [ACTIVE_KEY]: active })
}

export async function appendClick(click: RawClick): Promise<void> {
  const active = await getActiveRecording()
  if (!active) return
  active.clicks.push(click)
  await chrome.storage.local.set({ [ACTIVE_KEY]: active })
}

export async function discardRecording(): Promise<void> {
  await chrome.storage.local.remove(ACTIVE_KEY)
}

/** Stop recording and persist the raw click list under a user-chosen name. */
export async function finishRecording(name: string): Promise<RawRecording | null> {
  const active = await getActiveRecording()
  if (!active) return null
  const recording: RawRecording = {
    id: crypto.randomUUID(),
    name,
    createdAt: active.startedAt,
    clicks: active.clicks,
  }
  const all = await listRawRecordings()
  all.push(recording)
  await chrome.storage.local.set({ [RECORDINGS_KEY]: all })
  await chrome.storage.local.remove(ACTIVE_KEY)
  return recording
}

export async function deleteRawRecording(id: string): Promise<void> {
  const all = await listRawRecordings()
  await chrome.storage.local.set({ [RECORDINGS_KEY]: all.filter((r) => r.id !== id) })
}

export async function listRawRecordings(): Promise<RawRecording[]> {
  const result = await chrome.storage.local.get(RECORDINGS_KEY)
  return (result[RECORDINGS_KEY] as RawRecording[] | undefined) ?? []
}

export const RECORDING_STORAGE_KEYS = { ACTIVE_KEY, RECORDINGS_KEY }
