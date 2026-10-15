/**
 * The service worker: the part of the extension that runs in Chrome itself,
 * not in any page.
 *
 * It does nothing until the toolbar icon is clicked. Then it injects the
 * content script into that one tab, which `activeTab` allows for as long as
 * the tab stays on the same site, and marks the icon once the script says
 * it is running.
 *
 * Chrome stops the worker whenever it is idle and starts it again for the
 * next event, so nothing here may live in a variable between events, and
 * every listener is registered at the top level, where a restarted worker
 * registers it again before the event is delivered.
 */
import { readMessage } from './messages'

/** The file the build writes for the content script. */
const CONTENT_SCRIPT = 'content.js'

/** The badge on a tab where Wendmark is running. */
const BADGE = 'on'

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return
  // Chrome's own pages, the Web Store and the like refuse every extension.
  // There is nothing to do there, and nothing worth an error.
  chrome.scripting
    .executeScript({ target: { tabId: tab.id }, files: [CONTENT_SCRIPT] })
    .catch(() => undefined)
})

chrome.runtime.onMessage.addListener((raw, sender) => {
  const message = readMessage(raw)
  const tabId = sender.tab?.id
  if (!message || tabId === undefined) return

  if (message.type === 'wendmark:ready') {
    void chrome.action.setBadgeBackgroundColor({ tabId, color: '#0f766e' })
    void chrome.action.setBadgeText({ tabId, text: BADGE })
  }
})

// A new page in the tab means a fresh document: the content script there is
// gone, so the badge goes too.
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading') void chrome.action.setBadgeText({ tabId, text: '' })
})
