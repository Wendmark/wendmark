/**
 * What the extension knows about each tab, kept in `chrome.storage.session`:
 * in memory, gone when the browser closes, and safe from the service worker
 * being stopped between events.
 *
 *   site:<tabId>   the origin the content script reported from
 *   draft:<tabId>  a recording in progress there, so a page load does not
 *                  lose it
 */
import type { Draft } from '@wendmark/snippet/engine'
import { readDraft } from './messages'

const session = () => chrome.storage.session

const siteKey = (tabId: number) => `site:${tabId}`
const draftKey = (tabId: number) => `draft:${tabId}`

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

/** Forgets a tab: its page is gone, or the tab is. */
export function forgetSite(tabId: number): Promise<void> {
  return session().remove(siteKey(tabId))
}

export function forgetTab(tabId: number): Promise<void> {
  return session().remove([siteKey(tabId), draftKey(tabId)])
}
