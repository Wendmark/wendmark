import type { Step } from '@wendmark/core'
import type { Draft } from './draft'
import { isInputStep } from './draft'
import { createShell, SHELL_CSS } from '../overlay/shell'

/**
 * The recorder panel: the one piece of Wendmark a product owner really
 * works in. It lists what has been recorded so far and lets them fix it as
 * they go — rename a step, drop a misclick, move one, mark one as the
 * user's own data.
 *
 * Plain DOM inside the overlay's shadow root, like everything else the
 * snippet draws, so the customer's CSS cannot reach it and ours cannot
 * reach them.
 */

const PANEL_CSS = `
  ${SHELL_CSS}
  [data-wendmark="recorder"] header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 10px 10px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  }
  [data-wendmark="recorder"] header button {
    font: inherit;
    font-size: 13px;
    padding: 3px 8px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #8f8c9c;
    cursor: pointer;
  }
  [data-wendmark="recorder"] header button:hover {
    background: rgba(0, 0, 0, 0.06);
    color: #2a2833;
  }
  [data-wendmark="recorder"] input[data-wendmark="flow-name"] {
    flex: 1;
    min-width: 0;
    font: inherit;
    font-weight: 700;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 4px 6px;
    background: transparent;
    color: inherit;
  }
  [data-wendmark="recorder"] input[data-wendmark="flow-name"]:hover,
  [data-wendmark="recorder"] input[data-wendmark="flow-name"]:focus {
    border-color: rgba(0, 0, 0, 0.14);
    background: #fff;
    outline: none;
  }
  [data-wendmark="recorder"] .steps {
    flex: 1;
    /* Without this a flex child will not shrink below its content, and the
       list pushes the panel past its max-height instead of scrolling. */
    min-height: 0;
    overflow-y: auto;
    /* Reaching the end of the steps does not start scrolling the page. */
    overscroll-behavior: contain;
    padding: 8px;
    margin: 0;
    list-style: none;
  }
  [data-wendmark="recorder"] .step {
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 8px;
    padding: 8px;
    border-radius: 10px;
  }
  [data-wendmark="recorder"] .step:hover {
    background: rgba(14, 92, 87, 0.06);
  }
  [data-wendmark="recorder"] .marker {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #eeedf4;
    color: #6b6779;
    font-size: 11px;
    font-weight: 700;
  }
  [data-wendmark="recorder"] .step-text {
    font: inherit;
    width: 100%;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 3px 5px;
    background: transparent;
    color: inherit;
    resize: none;
    overflow: hidden;
  }
  [data-wendmark="recorder"] .step-text:hover,
  [data-wendmark="recorder"] .step-text:focus {
    border-color: rgba(0, 0, 0, 0.14);
    background: #fff;
    outline: none;
  }
  [data-wendmark="recorder"] .step-kind {
    font-size: 11px;
    color: #8f8c9c;
  }
  [data-wendmark="recorder"] .step-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  [data-wendmark="recorder"] .step-actions button {
    font: inherit;
    font-size: 11px;
    padding: 2px 7px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 6px;
    background: transparent;
    color: #5f5a70;
    cursor: pointer;
  }
  [data-wendmark="recorder"] .step-actions button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #2a2833;
  }
  [data-wendmark="recorder"] .step-actions button[aria-pressed="true"] {
    background: rgba(14, 92, 87, 0.12);
    border-color: rgba(14, 92, 87, 0.4);
    color: #0e5c57;
  }
  [data-wendmark="recorder"] .empty {
    padding: 16px 14px;
    color: #6b6779;
  }
  [data-wendmark="recorder"] footer {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.07);
  }
  [data-wendmark="recorder"] footer button {
    font: inherit;
    font-size: 12px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: transparent;
    color: #2a2833;
    cursor: pointer;
  }
  [data-wendmark="recorder"] footer button.primary {
    margin-left: auto;
    border-color: transparent;
    background: #0e5c57;
    color: #fff;
    font-weight: 600;
  }
  [data-wendmark="recorder"] footer button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  [data-wendmark="recorder"] .message {
    padding: 0 14px 10px;
    font-size: 12px;
    color: #6b6779;
  }

  /* Asked before throwing a recording away. */
  [data-wendmark="recorder"] .confirm {
    position: absolute;
    inset: 0 0 40px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    text-align: center;
    background: rgba(255, 255, 255, 0.97);
  }
  [data-wendmark="recorder"] .confirm[hidden] { display: none; }
  [data-wendmark="recorder"] .confirm strong { font-size: 15px; }
  [data-wendmark="recorder"] .confirm p { margin: 0 0 6px; color: #6b6779; }
  [data-wendmark="recorder"] .confirm div { display: flex; gap: 8px; }
  [data-wendmark="recorder"] .confirm button {
    font: inherit;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: #fff;
    color: #2a2833;
    cursor: pointer;
  }
  [data-wendmark="recorder"] .confirm button.danger {
    border-color: transparent;
    background: #c62828;
    color: #fff;
    font-weight: 600;
  }
`

/** What the panel asks the rest of author mode to do. */
export interface PanelHandlers {
  onRename: (name: string) => void
  onRetitle: (id: string, text: string) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onToggleDynamic: (id: string) => void
  onAddNote: () => void
  onTogglePause: () => void
  onTest: () => void
  onSave: () => void
  onCancel: () => void
}

export interface PanelState {
  draft: Draft
  paused: boolean
  saving: boolean
  message: string | null
}

export interface RecorderPanel {
  render: (state: PanelState) => void
  destroy: () => void
}

/** How a step reads in the list, next to its instruction. */
function describeKind(step: Step): string {
  if (step.type === 'instruction') return 'note'
  if (isInputStep(step)) return 'fills in'
  return step.dynamic ? 'clicks one of several' : 'clicks'
}

/** Where the recorder sits, remembered per site in this browser. */
const POSITION_KEY = 'wendmark:recorder-position'

/** What the bar says: whether clicks are being captured, and how many so far. */
function statusLabel(state: PanelState): string {
  if (state.saving) return 'Saving…'
  const count = state.draft.steps.length
  const steps = `${count} ${count === 1 ? 'step' : 'steps'}`
  return `${state.paused ? 'Paused' : 'Recording'} · ${steps}`
}

/** Creates the recorder panel inside the overlay's shadow root. */
export function createRecorderPanel(
  root: ShadowRoot,
  doc: Document,
  handlers: PanelHandlers,
): RecorderPanel {
  const style = doc.createElement('style')
  style.textContent = PANEL_CSS
  root.appendChild(style)

  // Dark, with a recording light, so it is never mistaken for a guide.
  const shell = createShell(root, doc, {
    kind: 'recorder',
    name: 'Wendmark recorder',
    width: 320,
    positionKey: POSITION_KEY,
    tone: 'dark',
    recording: true,
    fallback: { width: 320, height: 420 },
  })
  const panel = shell.sheet

  // ---- header: editable name, discard. Also the drag handle. ----
  const header = doc.createElement('header')

  const name = doc.createElement('input')
  name.dataset.wendmark = 'flow-name'
  name.setAttribute('aria-label', 'Name of this process')
  name.addEventListener('change', () => handlers.onRename(name.value))

  const close = doc.createElement('button')
  close.type = 'button'
  close.className = 'discard'
  close.textContent = '✕'
  close.setAttribute('aria-label', 'Discard this recording')

  header.append(name, close)

  // ---- the steps ----
  const list = doc.createElement('ul')
  list.className = 'steps'

  const empty = doc.createElement('p')
  empty.className = 'empty'
  empty.textContent = 'Use your app as you normally would. Every click becomes a step.'

  const message = doc.createElement('p')
  message.className = 'message'

  // ---- footer: pause, note, test, save ----
  const footer = doc.createElement('footer')

  const pause = doc.createElement('button')
  pause.type = 'button'
  pause.addEventListener('click', () => handlers.onTogglePause())

  const note = doc.createElement('button')
  note.type = 'button'
  note.textContent = 'Add a note'
  note.addEventListener('click', () => handlers.onAddNote())

  const test = doc.createElement('button')
  test.type = 'button'
  test.textContent = 'Test'
  test.addEventListener('click', () => handlers.onTest())

  const save = doc.createElement('button')
  save.type = 'button'
  save.className = 'primary'
  save.addEventListener('click', () => handlers.onSave())

  footer.append(pause, note, test, save)

  // ---- asking before a recording is thrown away ----
  const confirm = doc.createElement('div')
  confirm.className = 'confirm'
  confirm.setAttribute('role', 'alertdialog')
  confirm.hidden = true
  const confirmTitle = doc.createElement('strong')
  const confirmText = doc.createElement('p')
  confirmText.textContent = "This can't be undone."
  const confirmButtons = doc.createElement('div')
  const keep = doc.createElement('button')
  keep.type = 'button'
  keep.className = 'keep'
  keep.textContent = 'Keep recording'
  const discard = doc.createElement('button')
  discard.type = 'button'
  discard.className = 'danger'
  discard.textContent = 'Discard'
  confirmButtons.append(keep, discard)
  confirm.append(confirmTitle, confirmText, confirmButtons)
  confirm.setAttribute('aria-label', 'Discard this recording?')

  for (const part of [header, list, empty, message, footer, confirm]) {
    panel.insertBefore(part, shell.bar)
  }

  let stepCount = 0

  close.addEventListener('click', () => {
    // Nothing to lose yet: no need to ask.
    if (stepCount === 0) {
      handlers.onCancel()
      return
    }
    confirmTitle.textContent = `Discard ${stepCount} recorded ${stepCount === 1 ? 'step' : 'steps'}?`
    confirm.hidden = false
    keep.focus()
  })
  keep.addEventListener('click', () => {
    confirm.hidden = true
  })
  discard.addEventListener('click', () => handlers.onCancel())

  /** One row per step, rebuilt whenever the draft changes. */
  function renderStep(step: Step, index: number, total: number): HTMLLIElement {
    const row = doc.createElement('li')
    row.className = 'step'

    const marker = doc.createElement('span')
    marker.className = 'marker'
    marker.textContent = String(index + 1)

    const body = doc.createElement('div')

    const text = doc.createElement('textarea')
    text.className = 'step-text'
    text.rows = 1
    text.value = step.text
    text.setAttribute('aria-label', `Step ${index + 1} instruction`)
    text.addEventListener('change', () => handlers.onRetitle(step.id, text.value))

    const kind = doc.createElement('span')
    kind.className = 'step-kind'
    kind.textContent = describeKind(step)

    const actions = doc.createElement('div')
    actions.className = 'step-actions'

    if (step.type === 'action') {
      const dynamic = doc.createElement('button')
      dynamic.type = 'button'
      dynamic.textContent = 'Their own data'
      dynamic.title = 'The user picks one of several similar items here'
      dynamic.setAttribute('aria-pressed', String(step.dynamic))
      dynamic.addEventListener('click', () => handlers.onToggleDynamic(step.id))
      actions.appendChild(dynamic)
    }

    const up = doc.createElement('button')
    up.type = 'button'
    up.textContent = '↑'
    up.setAttribute('aria-label', `Move step ${index + 1} earlier`)
    up.disabled = index === 0
    up.addEventListener('click', () => handlers.onMove(step.id, -1))

    const down = doc.createElement('button')
    down.type = 'button'
    down.textContent = '↓'
    down.setAttribute('aria-label', `Move step ${index + 1} later`)
    down.disabled = index === total - 1
    down.addEventListener('click', () => handlers.onMove(step.id, 1))

    const remove = doc.createElement('button')
    remove.type = 'button'
    remove.textContent = 'Delete'
    remove.setAttribute('aria-label', `Delete step ${index + 1}`)
    remove.addEventListener('click', () => handlers.onRemove(step.id))

    actions.append(up, down, remove)
    body.append(text, kind, actions)
    row.append(marker, body)
    return row
  }

  // The header drags the panel too, except its name field and button.
  shell.addHandle(header, (target) => target.closest('input, button') !== null)
  // It grows out of its pill when recording starts, like the launcher does.
  shell.grow()

  return {
    render: (state: PanelState) => {
      stepCount = state.draft.steps.length
      shell.setLabel(statusLabel(state))
      shell.pill
        .querySelector('.rec-dot')
        ?.classList.toggle('is-paused', state.paused || state.saving)

      if (doc.activeElement !== name) name.value = state.draft.name

      pause.textContent = state.paused ? 'Resume' : 'Pause'

      const count = state.draft.steps.length
      save.disabled = state.saving || count === 0
      save.textContent = state.saving ? 'Saving…' : 'Save'
      test.disabled = count === 0

      empty.style.display = count === 0 ? 'block' : 'none'
      message.textContent = state.message ?? ''
      message.style.display = state.message ? 'block' : 'none'

      list.textContent = ''
      state.draft.steps.forEach((step, index) => {
        list.appendChild(renderStep(step, index, count))
      })
      // Each recorded step makes it taller. Don't let it grow off the screen.
      shell.keepOnScreen()
    },
    destroy: () => {
      shell.destroy()
      style.remove()
    },
  }
}
