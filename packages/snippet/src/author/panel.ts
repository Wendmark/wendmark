import type { Step } from '@wendmark/core'
import type { Draft } from './draft'
import { isInputStep } from './draft'

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
  [data-wendmark="recorder"] {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 320px;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 14px 40px rgba(30, 25, 70, 0.22);
    color: #2a2833;
    font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    pointer-events: auto;
  }
  [data-wendmark="recorder"] header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  }
  [data-wendmark="recorder"] .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e5484d;
    animation: wendmark-recording 1.4s ease-in-out infinite;
  }
  [data-wendmark="recorder"].is-paused .dot {
    background: #b0a9c0;
    animation: none;
  }
  @keyframes wendmark-recording {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-wendmark="recorder"] .dot { animation: none; }
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
    overflow-y: auto;
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
    background: rgba(90, 72, 232, 0.06);
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
    background: rgba(90, 72, 232, 0.12);
    border-color: rgba(90, 72, 232, 0.4);
    color: #5a48e8;
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
    background: #5a48e8;
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

/** Creates the recorder panel inside the overlay's shadow root. */
export function createRecorderPanel(
  root: ShadowRoot,
  doc: Document,
  handlers: PanelHandlers,
): RecorderPanel {
  const style = doc.createElement('style')
  style.textContent = PANEL_CSS
  root.appendChild(style)

  const panel = doc.createElement('div')
  panel.dataset.wendmark = 'recorder'

  // ---- header: recording light, editable name, close ----
  const header = doc.createElement('header')
  const dot = doc.createElement('span')
  dot.className = 'dot'

  const name = doc.createElement('input')
  name.dataset.wendmark = 'flow-name'
  name.setAttribute('aria-label', 'Name of this process')
  name.addEventListener('change', () => handlers.onRename(name.value))

  const close = doc.createElement('button')
  close.type = 'button'
  close.textContent = '✕'
  close.setAttribute('aria-label', 'Stop recording and discard')
  close.addEventListener('click', () => handlers.onCancel())

  header.append(dot, name, close)

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
  panel.append(header, list, empty, message, footer)
  root.appendChild(panel)

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

  return {
    render: (state: PanelState) => {
      if (doc.activeElement !== name) name.value = state.draft.name

      panel.classList.toggle('is-paused', state.paused)
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
    },
    destroy: () => {
      panel.remove()
      style.remove()
    },
  }
}
