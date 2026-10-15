/**
 * The content script: injected into one page when the toolbar icon is
 * clicked, and running beside the page's own code.
 *
 * It shares the page's DOM but not its JavaScript: it runs in an "isolated
 * world", so the page cannot see or change anything defined here, and this
 * cannot see the page's variables. The recorder and player run here, from
 * the snippet's engine, drawing in their own shadow root as they do in the
 * snippet.
 *
 * Wendmark guides; it never acts. Nothing here clicks, types or navigates
 * for anyone, and the recorder never reads what anyone types.
 */
import type { Flow } from '@wendmark/core'
import {
  startFlow,
  startRecorder,
  startRecording,
  type Draft,
  type Player,
  type Recorder,
  type SnippetApi,
} from '@wendmark/snippet/engine'
import { addGuide } from './guides'
import { readDraft, readMessage, type Message } from './messages'

/**
 * Clicking the icon twice injects this twice into the same page. The marker
 * lives in the isolated world's own global object, invisible to the page,
 * and stops the second copy.
 */
const MARKER = '__wendmarkExtension'
const world = globalThis as unknown as Record<string, unknown>

if (!world[MARKER]) {
  world[MARKER] = true
  run()
}

function send(message: Message): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => undefined)
}

function run(): void {
  let player: Player | null = null
  let recorder: Recorder | null = null

  // What the recorder borrows: playing (for Test) and recording.
  const api: SnippetApi = {
    startFlow: (flow: Flow, options = {}) => {
      player?.stop()
      const ended = () => {
        player = null
        options.onEnd?.()
      }
      // Nothing to remember between pages: a test is over when it ends.
      player = startFlow(flow, { storage: null, onFinish: ended, onStop: ended })
    },
    stopFlow: () => player?.stop(),
    startRecording,
  }

  function record(draft?: Draft): void {
    if (recorder) return
    recorder = startRecorder({
      doc: document,
      view: window,
      api,
      ...(draft ? { draft } : {}),
      savingText: 'Saving in this browser…',
      save: async (flow) => {
        try {
          await addGuide(chrome.storage.local, flow, location.origin)
          // Saved: a page load should not bring it back as unfinished.
          void send({ type: 'wendmark:draft-closed' })
          return { ok: true, message: 'Saved. You will find it in the Wendmark side panel.' }
        } catch {
          return { ok: false, error: 'Could not save it in this browser. Try again.' }
        }
      },
      onChange: (next) => void send({ type: 'wendmark:draft', draft: next }),
      onClose: () => {
        recorder = null
        void send({ type: 'wendmark:draft-closed' })
      },
    })
  }

  chrome.runtime.onMessage.addListener((raw, sender, reply) => {
    // Only the extension itself talks to this script.
    if (sender.id !== chrome.runtime.id) return false
    const message = readMessage(raw)
    if (message?.type === 'wendmark:start-recording') {
      record()
      reply({ ok: true })
    }
    return false
  })

  // Say where we are, and carry on with a recording a page load interrupted.
  void send({ type: 'wendmark:ready', origin: location.origin }).then((answer) => {
    const draft = readDraft((answer as { draft?: unknown } | undefined)?.draft)
    if (draft && draft.steps.length > 0) record(draft)
  })
}
