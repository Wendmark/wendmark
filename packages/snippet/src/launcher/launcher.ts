import type { FlowSummary } from '../portal/client'
import { isEmpty, sectionFlows, type LauncherSections } from './state'

/**
 * The "How do I…" panel: the only part of Wendmark an ordinary user opens.
 *
 * Wendmark is a guest in someone else's product, so this behaves like a
 * proper dialog — focus goes into it, Escape closes it, focus returns where
 * it was — and it is only ever opened because somebody asked for it.
 */

const CSS = `
  .sheet {
    position: fixed;
    right: 16px;
    bottom: 16px;
    width: min(340px, calc(100vw - 32px));
    max-height: min(70vh, 560px);
    overflow-y: auto;
    pointer-events: auto;
    background: #fff;
    color: #1f1d2b;
    border: 1px solid #e4e2ec;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(20, 18, 40, 0.18);
    font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    padding: 14px 16px 16px;
  }
  header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  h2 { margin: 0; font-size: 15px; flex: 1; }
  h3 {
    margin: 14px 0 6px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b6779;
  }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  button {
    font: inherit;
    cursor: pointer;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
  }
  .item {
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    border-color: #e4e2ec;
    display: block;
  }
  .item:hover { background: #f7f7fb; }
  .item:focus-visible, .close:focus-visible { outline: 2px solid #5a48e8; outline-offset: 2px; }
  .item .meta { display: block; color: #6b6779; font-size: 12px; margin-top: 2px; }
  .item.resume { border-color: #5a48e8; }
  .close { padding: 4px 8px; color: #6b6779; font-size: 16px; line-height: 1; }
  .empty { margin: 10px 0 2px; color: #6b6779; }
  .done { color: #1e7a3c; }
`

export interface LauncherOptions {
  /** What the user was partway through, if anything. */
  unfinishedId: string | null
  completedIds: readonly string[]
  /** Chosen a process. The launcher closes itself first. */
  onChoose: (flowId: string) => void
}

export interface Launcher {
  close: () => void
}

/** Focusable things inside the panel, in tab order. */
function focusable(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>('button')]
}

/**
 * Opens the panel. Returns a way to close it, and closes itself when a
 * process is chosen.
 */
export function openLauncher(
  root: ShadowRoot,
  doc: Document,
  flows: FlowSummary[],
  options: LauncherOptions,
): Launcher {
  const style = doc.createElement('style')
  style.textContent = CSS
  root.appendChild(style)

  const panel = doc.createElement('div')
  panel.className = 'sheet'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'false')
  panel.setAttribute('aria-label', 'How do I…')

  const sections = sectionFlows({
    flows,
    unfinishedId: options.unfinishedId,
    completedIds: options.completedIds,
  })
  const returnFocus = doc.activeElement

  panel.appendChild(header(doc, close))
  panel.appendChild(body(doc, sections, options, choose))
  root.appendChild(panel)

  focusable(panel)[0]?.focus()
  doc.addEventListener('keydown', onKeyDown, true)

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return

    // A dialog the user cannot tab out of, so the page behind stays out of
    // the way while it is open.
    const stops = focusable(panel)
    const first = stops[0]
    const last = stops[stops.length - 1]
    if (!first || !last) return

    const active = root.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function close(): void {
    doc.removeEventListener('keydown', onKeyDown, true)
    panel.remove()
    style.remove()
    if (returnFocus instanceof HTMLElement) returnFocus.focus()
  }

  function choose(flowId: string): void {
    close()
    options.onChoose(flowId)
  }

  return { close }
}

function header(doc: Document, onClose: () => void): HTMLElement {
  const element = doc.createElement('header')

  const title = doc.createElement('h2')
  title.textContent = 'How do I…'

  const close = doc.createElement('button')
  close.type = 'button'
  close.className = 'close'
  close.textContent = '×'
  close.setAttribute('aria-label', 'Close')
  close.addEventListener('click', onClose)

  element.append(title, close)
  return element
}

function body(
  doc: Document,
  sections: LauncherSections,
  options: LauncherOptions,
  onChoose: (flowId: string) => void,
): HTMLElement {
  const wrapper = doc.createElement('div')

  if (isEmpty(sections)) {
    const empty = doc.createElement('p')
    empty.className = 'empty'
    empty.textContent = 'Nothing to show here yet.'
    wrapper.appendChild(empty)
    return wrapper
  }

  if (sections.unfinished) {
    wrapper.appendChild(heading(doc, 'Carry on'))
    wrapper.appendChild(list(doc, [sections.unfinished], options, onChoose, true))
  }
  if (sections.here.length > 0) {
    wrapper.appendChild(heading(doc, 'On this page'))
    wrapper.appendChild(list(doc, sections.here, options, onChoose, false))
  }
  if (sections.elsewhere.length > 0) {
    wrapper.appendChild(heading(doc, 'Elsewhere in this app'))
    wrapper.appendChild(list(doc, sections.elsewhere, options, onChoose, false))
  }

  return wrapper
}

function heading(doc: Document, text: string): HTMLElement {
  const element = doc.createElement('h3')
  element.textContent = text
  return element
}

function list(
  doc: Document,
  flows: FlowSummary[],
  options: LauncherOptions,
  onChoose: (flowId: string) => void,
  resuming: boolean,
): HTMLElement {
  const element = doc.createElement('ul')

  for (const flow of flows) {
    const item = doc.createElement('li')
    const button = doc.createElement('button')
    button.type = 'button'
    button.className = resuming ? 'item resume' : 'item'
    button.textContent = flow.name

    const meta = doc.createElement('span')
    meta.className = options.completedIds.includes(flow.id) ? 'meta done' : 'meta'
    const steps = `${flow.steps} ${flow.steps === 1 ? 'step' : 'steps'}`
    meta.textContent = resuming
      ? 'Pick up where you left off'
      : options.completedIds.includes(flow.id)
        ? `✓ Done before · ${steps}`
        : flow.description
          ? `${flow.description} · ${steps}`
          : steps
    button.appendChild(meta)

    button.addEventListener('click', () => {
      onChoose(flow.id)
    })
    item.appendChild(button)
    element.appendChild(item)
  }

  return element
}
