/**
 * The authoring bundle: everything only a person recording a process needs.
 *
 * Built as its own file and fetched on demand, so it costs ordinary
 * visitors nothing.
 */
import { createOverlay } from '../overlay/overlay'
import {
  addNote,
  addStep,
  canSave,
  emptyDraft,
  moveStep,
  removeStep,
  renameDraft,
  retitleStep,
  setDynamic,
  toFlow,
  type Draft,
} from './draft'
import type { AuthorContext } from './loader'
import { createRecorderPanel } from './panel'
import { saveDraft as sendDraft } from './save'

/**
 * Starts authoring in this page: record what the author does, show it in a
 * panel they can fix as they go, and let them try it before saving.
 */
export function start(context: AuthorContext): void {
  const { doc, view } = context

  const overlay = createOverlay(doc)
  // The launcher would sit in the same corner. Out of the way while recording.
  context.api.setLauncherHidden?.(true)
  let draft: Draft = emptyDraft('Untitled process')
  let paused = false
  let saving = false
  let message: string | null = null

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

  // Record what the author does, using the snippet already on the page.
  // Steps arrive here as they happen.
  const recording = context.api.startRecording({
    doc,
    view,
    // The panel has its own recording light; two would be noise.
    showBadge: false,
    isPaused: () => paused,
    onStep: (step) => update(addStep(draft, step)),
  })

  function update(next: Draft): void {
    draft = next
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
   * Plays the draft back, so the author sees what the user will see.
   *
   * Recording pauses during the test — the author is clicking through what
   * they already recorded — and resumes the moment the test ends, so the
   * next real click is not silently swallowed.
   */
  function testDraft(): void {
    if (!canSave(draft)) return
    paused = true
    say('Testing. Recording pauses until the test finishes.')
    context.api.startFlow(toFlow(draft, `draft-${Date.now()}`), {
      onEnd: () => {
        paused = false
        say('Test finished. Recording again.')
      },
    })
  }

  /**
   * Sends the recording to the portal as a draft.
   *
   * Recording pauses while it is in flight and stays paused once it has been
   * saved: the author is done, and a stray click should not quietly append a
   * step to something they think they have finished.
   */
  async function saveDraft(): Promise<void> {
    if (!canSave(draft) || saving) return
    saving = true
    paused = true
    say('Saving to the portal…')

    const result = await sendDraft(
      context.portalOrigin,
      context.session.sessionToken,
      toFlow(draft, `draft-${Date.now()}`),
    )

    saving = false
    if (!result.ok) {
      paused = false
      say(result.error)
      return
    }

    say(`Saved as a draft. Open “${result.name}” in the portal to publish it.`)
  }

  function stop(): void {
    recording.stop()
    panel.destroy()
    overlay.destroy()
    context.api.setLauncherHidden?.(false)
  }

  render()
}
