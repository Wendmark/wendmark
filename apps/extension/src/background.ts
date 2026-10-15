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
 * - The play page on wendmark.dev hands over shared guides (play.ts). A
 *   guide being played is re-injected on every page load on its site,
 *   which the person allowed on the start page.
 *
 * Chrome stops the worker whenever it is idle and starts it again for the
 * next event, so nothing here lives in a variable between events, and every
 * listener is registered at the top level, where a restarted worker
 * registers it again before the event is delivered.
 */
import { readMessage, type ReadyReply, type RecordReply } from './messages'
import { PLAY_ORIGIN, readExternalMessage } from './play'
import {
  clearDraft,
  clearPlaying,
  draftOf,
  forgetSite,
  forgetTab,
  playingIn,
  setDraft,
  setPlaying,
  setSite,
  setWaitingToStart,
} from './tabs'
import { fromLink } from './transfer'

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
        const playing = await playingIn(tabId)
        const answer: ReadyReply = {
          draft: await draftOf(tabId),
          // Only on the site the guide is for.
          play:
            playing && playing.shared.origin === message.origin
              ? { flow: playing.shared.flow, stepIndex: playing.stepIndex }
              : null,
        }
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
    case 'wendmark:progress':
      if (tabId !== undefined) {
        void playingIn(tabId).then(
          (playing) => playing && setPlaying(tabId, { ...playing, stepIndex: message.stepIndex }),
        )
      }
      return false
    case 'wendmark:play-ended':
      if (tabId !== undefined) void clearPlaying(tabId)
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

// From the play page on wendmark.dev, and nowhere else: the manifest lets
// only that site send these, and this checks again.
chrome.runtime.onMessageExternal.addListener((raw, sender, reply) => {
  if (sender.origin !== PLAY_ORIGIN) return false
  const message = readExternalMessage(raw)
  if (!message) return false

  if (message.type === 'wendmark:hello') {
    reply({ ok: true, version: chrome.runtime.getManifest().version })
    return false
  }

  const tabId = sender.tab?.id
  void (async () => {
    const shared = await fromLink(message.link)
    if (!shared || tabId === undefined) {
      reply({ ok: false })
      return
    }
    // The start page asks for the site; it needs a click on a page of ours.
    await setWaitingToStart(tabId, shared)
    reply({ ok: true })
    await chrome.tabs.update(tabId, { url: chrome.runtime.getURL('start.html') })
  })()
  return true
})

// A new page in the tab means a fresh document: the content script there is
// gone, so the badge and the site go too. A recording in progress stays, to
// be picked up when the icon is clicked again. A guide being played carries
// on by itself, on the site the person allowed.
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'loading') {
    void chrome.action.setBadgeText({ tabId, text: '' })
    void forgetSite(tabId)
    return
  }
  if (change.status !== 'complete') return
  void (async () => {
    const playing = await playingIn(tabId)
    if (!playing || !tab.url) return
    if (new URL(tab.url).origin !== playing.shared.origin) return
    await chrome.scripting
      .executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] })
      .catch(() => undefined)
  })()
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void forgetTab(tabId)
})
