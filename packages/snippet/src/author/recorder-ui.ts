/**
 * The recorder as a person sees it: the dark panel, filling with steps as
 * they click, that they can tidy as they go, test, and save.
 *
 * Where a finished recording goes is the caller's business. Author mode
 * sends it to the portal as a draft; the browser extension keeps it in the
 * browser. Everything else — recording, the panel, testing — is the same.
 */
import type { Flow } from '@wendmark/core'
import { createOverlay } from '../overlay/overlay'
import {
  addNote,
  addStep,
  canSave,
  emptyDraft,
  moveStep,
  removeStep,
  renameDraft,
  replaceLastStep,
  retitleStep,
  setDynamic,
  toFlow,
  type Draft,
} from './draft'
import type { SnippetApi } from './loader'
import { createRecorderPanel } from './panel'

/** What saving said: a line for the panel either way. */
export type RecorderSaveResult = { ok: true; message: string } | { ok: false; error: string }

export interface RecorderOptions {
  doc: Document
  view: Window
  api: SnippetApi
  /** Keeps the finished recording somewhere. */
  save: (flow: Flow) => Promise<RecorderSaveResult>
  /** Shown while saving, e.g. "Saving to the portal…". */
  savingText: string
  /** A recording to carry on with, e.g. after the page reloaded. */
  draft?: Draft
  /** Told after every change, with the whole draft. */
  onChange?: (draft: Draft) => void
  /** Told once the person closes the recorder. */
  onClose?: () => void
}

export interface Recorder {
  stop: () => void
}

/**
 * Starts recording in this page: note what the person does, show it in a
 * panel they can fix as they go, and let them try it before saving.
 */
export function startRecorder(options: RecorderOptions): Recorder {
  const { doc, view, api } = options

  const overlay = createOverlay(doc)
  // The launcher would sit in the same corner. Out of the way while recording.
  api.setLauncherHidden?.(true)
  let draft: Draft = options.draft ?? emptyDraft('Untitled process')
  let paused = false
  let saving = false
  let message: string | null = null
  let stopped = false

  const panel = createRecorderPanel(overlay.root, doc, {
    onRename: (name) => update(renameDraft(draft, name)),
    onRetitle: (id, text) => update(retitleStep(draft, id, text)),
    onRemove: (id) => update(removeStep(draft, id)),
    onMove: (id, direction) => update(moveStep(draft, id, direction)),
    onToggleDynamic: (id) => {
      const step = draft.steps.find((candidate) => candidate.id === id)
      const dynamic = step?.type === 'action' ? !step.dynamic : false
      update(setDynamic(draft, id, dynamic))
    },
    onAddNote: () => {
      const text = view.prompt('What should the user read at this point?')
      if (text) update(addNote(draft, text))
    },
    onTogglePause: () => {
      paused = !paused
      say(paused ? 'Paused. Clicks are not being recorded.' : null)
    },
    onTest: () => testDraft(),
    onSave: () => void saveDraft(),
    onCancel: () => stop(),
  })

  // Record what the person does, using the engine already on the page.
  // Steps arrive here as they happen.
  const recording = api.startRecording({
    doc,
    view,
    // The panel has its own recording light; two would be noise.
    showBadge: false,
    isPaused: () => paused,
    // A field clicked and then filled in is one step: the second replaces
    // the first, here as in the recorder.
    onStep: (step, { replacesLast }) =>
      update(replacesLast ? replaceLastStep(draft, step) : addStep(draft, step)),
  })

  function update(next: Draft): void {
    draft = next
    options.onChange?.(draft)
    render()
  }

  function say(text: string | null): void {
    message = text
    render()
  }

  function render(): void {
    panel.render({ draft, paused, saving, message })
  }

  /**
   * Plays the draft back, so the person sees what others will see.
   *
   * Recording pauses during the test — they are clicking through what they
   * already recorded — and resumes the moment the test ends, so the next
   * real click is not silently swallowed.
   */
  function testDraft(): void {
    if (!canSave(draft)) return
    paused = true
    say('Testing. Recording pauses until the test finishes.')
    api.startFlow(toFlow(draft, `draft-${Date.now()}`), {
      onEnd: () => {
        paused = false
        say('Test finished. Recording again.')
      },
    })
  }

  /**
   * Saves the recording.
   *
   * Recording pauses while it is in flight and stays paused once it has been
   * saved: the person is done, and a stray click should not quietly append a
   * step to something they think they have finished.
   */
  async function saveDraft(): Promise<void> {
    if (!canSave(draft) || saving) return
    saving = true
    paused = true
    say(options.savingText)

    const result = await options.save(toFlow(draft, `draft-${Date.now()}`))

    saving = false
    if (!result.ok) {
      paused = false
      say(result.error)
      return
    }
    say(result.message)
  }

  function stop(): void {
    if (stopped) return
    stopped = true
    recording.stop()
    panel.destroy()
    overlay.destroy()
    api.setLauncherHidden?.(false)
    options.onClose?.()
  }

  render()
  return { stop }
}
