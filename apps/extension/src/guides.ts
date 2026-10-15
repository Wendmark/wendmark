/**
 * Guides kept in this browser.
 *
 * A guide is a flow, in the same format the portal reads, plus where it was
 * recorded, when, and whether it is pinned. They live in
 * `chrome.storage.local`: on this machine, kept across restarts, sent
 * nowhere. Guides are for one-off "here's how", so an unpinned one is
 * tidied away after 30 days.
 *
 * The functions take the storage area as an argument, so the rules can be
 * tested without Chrome.
 */
import type { Flow } from '@wendmark/core'
import { looksLikeFlow } from '@wendmark/core/guard'

export interface StoredGuide {
  id: string
  flow: Flow
  /** The site it was recorded on, e.g. "https://app.example.com". */
  origin: string
  /** Milliseconds since the epoch. */
  createdAt: number
  pinned: boolean
}

/** The part of `chrome.storage.local` this needs. */
export interface StorageArea {
  get: (key: string) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

const KEY = 'guides'

/** How long an unpinned guide is kept. */
export const KEEP_FOR_MS = 30 * 24 * 60 * 60 * 1000

function isStoredGuide(value: unknown): value is StoredGuide {
  if (typeof value !== 'object' || value === null) return false
  const guide = value as Partial<StoredGuide>
  return (
    typeof guide.id === 'string' &&
    typeof guide.origin === 'string' &&
    typeof guide.createdAt === 'number' &&
    typeof guide.pinned === 'boolean' &&
    looksLikeFlow(guide.flow)
  )
}

/** Pinned guides, and unpinned ones younger than 30 days. */
export function tidy(guides: readonly StoredGuide[], now: number): StoredGuide[] {
  return guides.filter((guide) => guide.pinned || now - guide.createdAt < KEEP_FOR_MS)
}

/** Every guide, newest first, tidied. Anything unreadable is dropped. */
async function readAll(area: StorageArea, now: number): Promise<StoredGuide[]> {
  const stored = (await area.get(KEY))[KEY]
  const guides = Array.isArray(stored) ? stored.filter(isStoredGuide) : []
  const kept = tidy(guides, now)
  if (kept.length !== (Array.isArray(stored) ? stored.length : 0)) {
    await area.set({ [KEY]: kept })
  }
  return kept.sort((a, b) => b.createdAt - a.createdAt)
}

/** The guides recorded on one site, newest first. */
export async function guidesFor(
  area: StorageArea,
  origin: string,
  now = Date.now(),
): Promise<StoredGuide[]> {
  return (await readAll(area, now)).filter((guide) => guide.origin === origin)
}

/** Every guide, newest first. */
export function allGuides(area: StorageArea, now = Date.now()): Promise<StoredGuide[]> {
  return readAll(area, now)
}

/** Keeps a newly recorded flow. Returns what was stored. */
export async function addGuide(
  area: StorageArea,
  flow: Flow,
  origin: string,
  now = Date.now(),
): Promise<StoredGuide> {
  const guide: StoredGuide = {
    id: `guide-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    flow,
    origin,
    createdAt: now,
    pinned: false,
  }
  const guides = await readAll(area, now)
  await area.set({ [KEY]: [guide, ...guides] })
  return guide
}

/** Pins a guide so it is never tidied away, or unpins it. */
export async function setPinned(
  area: StorageArea,
  id: string,
  pinned: boolean,
  now = Date.now(),
): Promise<void> {
  const guides = await readAll(area, now)
  await area.set({
    [KEY]: guides.map((guide) => (guide.id === id ? { ...guide, pinned } : guide)),
  })
}

/** Removes a guide now. */
export async function removeGuide(area: StorageArea, id: string, now = Date.now()): Promise<void> {
  const guides = await readAll(area, now)
  await area.set({ [KEY]: guides.filter((guide) => guide.id !== id) })
}

/** Whether a change to storage touched the guides. */
export function guidesChanged(changes: Record<string, unknown>): boolean {
  return KEY in changes
}
