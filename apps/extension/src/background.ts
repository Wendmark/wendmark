/**
 * The service worker: the part of the extension that runs in Chrome itself,
 * not in any page. It connects the others.
 *
 * - The toolbar icon opens the side panel for that tab and injects the
 *   content script there, which `activeTab` allows for as long as the tab
 *   stays on that page. Nothing runs anywhere until then.
 * - The side panel's Record button arrives here and is passed on to the
 *   tab's content script.
 * - The content script reports which site it is on and the recording in
 *   progress, kept per tab (tabs.ts) so a page load does not lose it.
 *
 * Chrome stops the worker whenever it is idle and starts it again for the
 * next event, so nothing here lives in a variable between events, and every
 * listener is registered at the top level, where a restarted worker
 * registers it again before the event is delivered.
 */
import { readMessage, type ReadyReply, type RecordReply } from './messages'
import { clearDraft, draftOf, forgetSite, forgetTab, setDraft, setSite } from './tabs'

/** The file the build writes for the content script. */
const CONTENT_SCRIPT = 'content.js'

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return
  // Must come first: Chrome lets the side panel open only in direct answer
  // to the click, before anything is awaited.
  void chrome.sidePanel.open({ tabId: tab.id }).catch(() => undefined)
  // Chrome's own pages, the Web Store and the like refuse every extension.
  // There is nothing to do there, and nothing worth an error.
  chrome.scripting
    .executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT] })
    .catch(() => undefined)
})

chrome.runtime.onMessage.addListener((raw, sender, reply) => {
  const message = readMessage(raw)
  if (!message) return false
  const tabId = sender.tab?.id
  // Only the extension's own pages (the side panel) send without a tab.
  const fromExtension = sender.id === chrome.runtime.id && sender.tab === undefined

  switch (message.type) {
    case 'wendmark:ready': {
      if (tabId === undefined) return false
      void (async () => {
        await setSite(tabId, message.origin)
        void chrome.action.setBadgeBackgroundColor({ tabId, color: '#0f766e' })
        void chrome.action.setBadgeText({ tabId, text: 'on' })
        const answer: ReadyReply = { draft: await draftOf(tabId) }
        reply(answer)
      })()
      // Answering after an await: keep the channel open.
      return true
    }
    case 'wendmark:draft':
      if (tabId !== undefined) void setDraft(tabId, message.draft)
      return false
    case 'wendmark:draft-closed':
      if (tabId !== undefined) void clearDraft(tabId)
      return false
    case 'wendmark:record': {
      if (!fromExtension) return false
      chrome.tabs
        .sendMessage(message.tabId, { type: 'wendmark:start-recording' })
        .then(() => reply({ ok: true } satisfies RecordReply))
        // No content script in that tab: it navigated since the icon was
        // clicked, or it never was.
        .catch(() => reply({ ok: false, reason: 'no-page' } satisfies RecordReply))
      return true
    }
    default:
      return false
  }
})

// A new page in the tab means a fresh document: the content script there is
// gone, so the badge and the site go too. A recording in progress stays, to
// be picked up when the icon is clicked again.
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status !== 'loading') return
  void chrome.action.setBadgeText({ tabId, text: '' })
  void forgetSite(tabId)
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void forgetTab(tabId)
})
