import type { Step } from '@wendmark/core'
import { createShell, SHELL_CSS } from '../overlay/shell'

/**
 * The panel a person reports a problem in.
 *
 * Three stages, in one panel that never leaves its corner:
 *
 *   retrace   they redo what went wrong; each control they press is listed
 *   describe  they say what went wrong, in a sentence, and check the list
 *   sent      thanks
 *
 * The list is the exact one that will be sent. Masking happens before a step
 * is shown here, never after, so what the person approves is the truth and
 * not a nicer version of it. Every step can be removed.
 *
 * Orange, unlike the teal guide and the dark recorder: somebody who is
 * already annoyed should not wonder which of Wendmark's panels this is.
 */

const PANEL_CSS = `
  ${SHELL_CSS}
  [data-wendmark="report"] header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 10px 10px 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  }
  [data-wendmark="report"] header strong { flex: 1; font-size: 14px; }
  [data-wendmark="report"] .body {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 12px 16px;
  }
  [data-wendmark="report"] .intro { margin: 0 0 10px; color: #5f5a70; }
  [data-wendmark="report"] ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  [data-wendmark="report"] li {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    border: 1px solid #ece7e1;
    border-radius: 8px;
  }
  [data-wendmark="report"] .marker {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #fbeee6;
    color: #9c3c13;
    font-size: 11px;
    font-weight: 700;
  }
  [data-wendmark="report"] .page { display: block; font-size: 11px; color: #8f8c9c; }
  [data-wendmark="report"] .nothing { margin: 4px 0; color: #8f8c9c; }
  [data-wendmark="report"] label {
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
    font-weight: 600;
  }
  [data-wendmark="report"] textarea {
    font: inherit;
    font-weight: 400;
    min-height: 72px;
    resize: vertical;
    padding: 8px;
    border: 1px solid rgba(0, 0, 0, 0.16);
    border-radius: 8px;
    color: inherit;
  }
  [data-wendmark="report"] textarea:focus { outline: 2px solid #b8491a; outline-offset: 0; }
  [data-wendmark="report"] .sent { margin: 6px 0; font-size: 14px; }
  [data-wendmark="report"] .problem { margin: 8px 0 0; color: #a32f22; }
  [data-wendmark="report"] footer {
    display: flex;
    gap: 6px;
    padding: 10px 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.07);
  }
  [data-wendmark="report"] button {
    font: inherit;
    cursor: pointer;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: transparent;
    color: #2a2833;
    padding: 6px 12px;
  }
  [data-wendmark="report"] button.primary {
    margin-left: auto;
    border-color: transparent;
    background: #b8491a;
    color: #fff;
    font-weight: 600;
  }
  [data-wendmark="report"] button:disabled { opacity: 0.5; cursor: default; }
  [data-wendmark="report"] li button,
  [data-wendmark="report"] header button {
    border: none;
    padding: 2px 7px;
    color: #8f8c9c;
  }
`

export type ReportStage = 'retrace' | 'describe' | 'sending' | 'sent' | 'failed'

export interface ReportPanelState {
  stage: ReportStage
  /** What will be sent, already masked. */
  steps: readonly Step[]
}

export interface ReportPanelHandlers {
  onDone: () => void
  onBack: () => void
  onRemove: (index: number) => void
  onSend: (note: string) => void
  onClose: () => void
}

export interface ReportPanel {
  render: (state: ReportPanelState) => void
  destroy: () => void
}

/** The wording a step is listed with, and the page it happened on. */
function describe(step: Step): { text: string; page: string | null } {
  if (step.type === 'instruction') return { text: step.text, page: null }
  return { text: step.text, page: step.target.url ?? null }
}

export function createReportPanel(
  root: ShadowRoot,
  doc: Document,
  handlers: ReportPanelHandlers,
): ReportPanel {
  const style = doc.createElement('style')
  style.textContent = PANEL_CSS
  root.appendChild(style)

  const shell = createShell(root, doc, {
    kind: 'report',
    name: 'Report a problem',
    width: 320,
    positionKey: 'wendmark:report-position',
    tone: 'signal',
    recording: true,
    fallback: { width: 320, height: 360 },
  })
  const panel = shell.sheet

  const header = doc.createElement('header')
  const title = doc.createElement('strong')
  title.textContent = 'Report a problem'
  const close = doc.createElement('button')
  close.type = 'button'
  close.className = 'close'
  close.textContent = '✕'
  close.setAttribute('aria-label', 'Close without sending')
  close.addEventListener('click', () => handlers.onClose())
  header.append(title, close)
  shell.addHandle(header, (target) => target.closest('button') !== null)

  const body = doc.createElement('div')
  body.className = 'body'
  const footer = doc.createElement('footer')
  panel.insertBefore(header, shell.bar)
  panel.insertBefore(body, shell.bar)
  panel.insertBefore(footer, shell.bar)

  // Kept across renders, so a re-render while they type loses nothing.
  const note = doc.createElement('textarea')
  note.name = 'wendmark-report-note'
  note.maxLength = 2000
  note.placeholder = 'I pressed Save and nothing happened.'

  let state: ReportPanelState = { stage: 'retrace', steps: [] }

  function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const element = doc.createElement('button')
    element.type = 'button'
    element.textContent = text
    if (className) element.className = className
    element.addEventListener('click', onClick)
    return element
  }

  function stepList(): HTMLElement {
    if (state.steps.length === 0) {
      const nothing = doc.createElement('p')
      nothing.className = 'nothing'
      nothing.textContent = 'Nothing noted yet.'
      return nothing
    }
    const list = doc.createElement('ol')
    state.steps.forEach((step, index) => {
      const item = doc.createElement('li')
      const marker = doc.createElement('span')
      marker.className = 'marker'
      marker.textContent = String(index + 1)
      marker.setAttribute('aria-hidden', 'true')

      const { text, page } = describe(step)
      const words = doc.createElement('span')
      // textContent, never innerHTML: step text comes from the page.
      words.textContent = text
      if (page) {
        const where = doc.createElement('span')
        where.className = 'page'
        where.textContent = page
        words.appendChild(where)
      }

      const remove = button('✕', '', () => handlers.onRemove(index))
      remove.setAttribute('aria-label', `Leave out step ${index + 1}`)
      item.append(marker, words, remove)
      list.appendChild(item)
    })
    return list
  }

  function sendable(): boolean {
    return note.value.trim() !== '' && state.steps.length > 0
  }

  function draw(): void {
    body.replaceChildren()
    footer.replaceChildren()
    const count = state.steps.length
    const steps = `${count} ${count === 1 ? 'step' : 'steps'}`

    if (state.stage === 'retrace') {
      const intro = doc.createElement('p')
      intro.className = 'intro'
      intro.textContent =
        'Do what you did before. Each thing you press is noted here, never what you type.'
      body.append(intro, stepList())
      const done = button('Done', 'primary', () => handlers.onDone())
      done.disabled = count === 0
      footer.append(
        button('Cancel', '', () => handlers.onClose()),
        done,
      )
      shell.setLabel(`Noting what you do · ${steps}`)
    } else if (state.stage === 'sent') {
      const thanks = doc.createElement('p')
      thanks.className = 'sent'
      thanks.textContent = 'Thanks. Your report was sent.'
      body.append(thanks)
      footer.append(button('Close', 'primary', () => handlers.onClose()))
      shell.setLabel('Report sent')
    } else {
      const label = doc.createElement('label')
      label.append('What went wrong?', note)
      const intro = doc.createElement('p')
      intro.className = 'intro'
      intro.textContent =
        'This is everything that will be sent. Leave out anything you would rather not.'
      body.append(label, intro, stepList())
      if (state.stage === 'failed') {
        const problem = doc.createElement('p')
        problem.className = 'problem'
        problem.setAttribute('role', 'alert')
        problem.textContent = 'It could not be sent. Check your connection and try again.'
        body.append(problem)
      }
      const send = button(state.stage === 'sending' ? 'Sending…' : 'Send report', 'primary', () =>
        handlers.onSend(note.value.trim()),
      )
      send.disabled = state.stage === 'sending' || !sendable()
      note.oninput = () => {
        send.disabled = state.stage === 'sending' || !sendable()
      }
      footer.append(
        button('Back', '', () => handlers.onBack()),
        send,
      )
      shell.setLabel(`Your report · ${steps}`)
    }
    shell.pill.querySelector('.rec-dot')?.classList.toggle('is-paused', state.stage !== 'retrace')
    shell.keepOnScreen()
  }

  draw()
  shell.grow()

  return {
    render: (next) => {
      const stageChanged = next.stage !== state.stage
      state = next
      draw()
      if (stageChanged && next.stage === 'describe') note.focus()
    },
    destroy: () => {
      shell.destroy()
      style.remove()
    },
  }
}
