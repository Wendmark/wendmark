/**
 * The content script: injected into one page when the toolbar icon is
 * clicked, and running beside the page's own code.
 *
 * It shares the page's DOM but not its JavaScript: it runs in an "isolated
 * world", so the page cannot see or change anything defined here, and this
 * cannot see the page's variables. That is where the recorder and the
 * player will run. For now it only reports that it is there.
 *
 * Clicking the icon twice injects it twice into the same page. The marker
 * below lives in the isolated world's own global object, invisible to the
 * page, and stops the second copy.
 */
import type { Message } from './messages'

const MARKER = '__wendmarkExtension'
const world = globalThis as unknown as Record<string, unknown>

if (!world[MARKER]) {
  world[MARKER] = true
  const ready: Message = { type: 'wendmark:ready' }
  void chrome.runtime.sendMessage(ready)
}
