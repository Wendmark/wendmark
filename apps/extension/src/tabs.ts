/**
 * What the extension knows about each tab, kept in `chrome.storage.session`:
 * in memory, gone when the browser closes, and safe from the service worker
 * being stopped between events.
 *
 *   site:<tabId>   the origin the content script reported from
 *   draft:<tabId>  a recording in progress there, so a page load does not
 *                  lose it
 *   start:<tabId>  a shared guide waiting on the start page for permission
 *   play:<tabId>   a shared guide being played there, and its step
 */
import type { Draft } from '@wendmark/snippet/engine'
import { readDraft } from './messages'
import type { Playing } from './play'
import { readShared, type Shared } from './transfer'

const session = () => chrome.storage.session

const siteKey = (tabId: number) => `site:${tabId}`
const draftKey = (tabId: number) => `draft:${tabId}`
const startKey = (tabId: number) => `start:${tabId}`
const playKey = (tabId: number) => `play:${tabId}`

export async function siteOf(tabId: number): Promise<string | null> {
  const value = (await session().get(siteKey(tabId)))[siteKey(tabId)]
  return typeof value === 'string' ? value : null
}

export function setSite(tabId: number, origin: string): Promise<void> {
  return session().set({ [siteKey(tabId)]: origin })
}

export async function draftOf(tabId: number): Promise<Draft | null> {
  return readDraft((await session().get(draftKey(tabId)))[draftKey(tabId)])
}

export function setDraft(tabId: number, draft: Draft): Promise<void> {
  return session().set({ [draftKey(tabId)]: draft })
}

export function clearDraft(tabId: number): Promise<void> {
  return session().remove(draftKey(tabId))
}

export async function waitingToStart(tabId: number): Promise<Shared | null> {
  const value = (await session().get(startKey(tabId)))[startKey(tabId)]
  return readShared(value)
}

export function setWaitingToStart(tabId: number, shared: Shared): Promise<void> {
  return session().set({ [startKey(tabId)]: { v: 1, ...shared } })
}

export function clearWaitingToStart(tabId: number): Promise<void> {
  return session().remove(startKey(tabId))
}

export async function playingIn(tabId: number): Promise<Playing | null> {
  const value = (await session().get(playKey(tabId)))[playKey(tabId)] as
    { shared?: unknown; stepIndex?: unknown } | undefined
  const shared = readShared(value?.shared)
  if (!shared) return null
  const stepIndex = typeof value?.stepIndex === 'number' ? value.stepIndex : 0
  return { shared, stepIndex }
}

export function setPlaying(tabId: number, playing: Playing): Promise<void> {
  return session().set({
    [playKey(tabId)]: { shared: { v: 1, ...playing.shared }, stepIndex: playing.stepIndex },
  })
}

export function clearPlaying(tabId: number): Promise<void> {
  return session().remove(playKey(tabId))
}

/** Forgets a tab: its page is gone, or the tab is. */
export function forgetSite(tabId: number): Promise<void> {
  return session().remove(siteKey(tabId))
}

export function forgetTab(tabId: number): Promise<void> {
  return session().remove([siteKey(tabId), draftKey(tabId), startKey(tabId), playKey(tabId)])
}
