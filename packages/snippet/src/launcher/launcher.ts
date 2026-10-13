import {
  clampAnchor,
  dragAnchor,
  placeAt,
  sizeOf,
  viewportOf,
  type Anchor,
  type Position,
} from '../overlay/anchor'
import { makeDraggable } from '../overlay/drag'
import { allowsMotion, clipTo, EASE, FOLD_MS, GROW_MS, OPEN_CLIP } from '../overlay/morph'
import type { FlowSummary } from '../portal/client'
import { fillPill, PILL_CSS, PILL_HEIGHT } from './pill'
import { isEmpty, sectionFlows, type LauncherSections } from './state'

/**
 * The "How do I…" panel: the only part of Wendmark an ordinary user opens.
 *
 * Wendmark is a guest in someone else's product, so this behaves like a
 * proper dialog — focus goes into it, Escape closes it, focus returns where
 * it was — and it is only ever opened because somebody asked for it.
 *
 * It is the launcher button, grown: the pill stays where it was and becomes
 * the panel's bar, and the list unfolds upward out of it. Pressing the bar
 * folds it back down.
 */

const CSS = `
  ${PILL_CSS}
  /* The shadow sits on a wrapper as a filter, so it follows the clipped
     shape while it grows. A box-shadow would be clipped away with it. */
  .frame {
    position: fixed;
    width: min(340px, calc(100vw - 32px));
    filter: drop-shadow(0 12px 28px rgba(20, 18, 40, 0.2));
  }
  .sheet {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    background: #fff;
    color: #1f1d2b;
    border-radius: 16px;
    overflow: hidden;
    font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  .list {
    padding: 12px 14px 12px;
    overflow-y: auto;
    max-height: calc(min(70vh, 560px) - ${PILL_HEIGHT}px);
  }
  h3 {
    margin: 14px 0 6px;
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b6779;
  }
  h3:first-child { margin-top: 2px; }
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
  .item:hover { background: #f6f9f8; border-color: #0e5c57; }
  .item:focus-visible { outline: 2px solid #0e5c57; outline-offset: 2px; }
  .item .meta { display: block; color: #6b6779; font-size: 12px; margin-top: 2px; }
  .item.resume { border-color: #0e5c57; }
  .empty { margin: 4px 0 2px; color: #6b6779; }
  .report {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 14px -2px 0;
    padding-top: 10px;
    border-top: 1px solid #ece7e1;
    color: #6b6779;
    font-size: 13px;
  }
  .report button {
    padding: 4px 8px;
    color: #9c3c13;
    font-weight: 600;
  }
  .report button:hover { background: #fbeee6; }
  .done { color: #1e7a3c; }

  /* The bar is the pill, stretched to the panel's width. Its contents stay
     on the right, exactly where the button had them, so nothing jumps. */
  .bar {
    display: flex;
    justify-content: flex-end;
    flex: none;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: #0e5c57;
    transition: background-color 160ms ease;
    touch-action: none;
  }
  .bar:hover { background: #0a4642; }
  .bar.is-dragging { cursor: grabbing; }
  .bar:focus-visible { outline: 2px solid #fff; outline-offset: -4px; border-radius: 12px; }
  /* Pointing down now: pressing it folds the panel away. */
  .bar .chevron { transform: rotate(180deg); }
`

export interface LauncherOptions {
  /** What this app calls its guidance, as set in the portal. */
  label: string
  /** What the user was partway through, if anything. */
  unfinishedId: string | null
  completedIds: readonly string[]
  /** Chosen a process. The launcher closes itself first. */
  onChoose: (flowId: string) => void
  /**
   * Closed, for any reason: its bar, Escape, a choice, or `close()`.
   * The panel can close itself, so this is how its owner finds out.
   * Called once the panel has folded away and left the page.
   */
  onClose: () => void
  /** Where it sits. Shared with the button, so both move together. */
  position: Position
  /** The button it grows out of, if there is one on screen. */
  from: DOMRect | null
  /**
   * Offered when the app lets its users report a problem. The launcher
   * closes itself first, so the report starts with the page in view.
   */
  onReport?: () => void
}

/** A stand-in size for layout-free environments (tests). */
const FALLBACK_SIZE = { width: 340, height: 300 }

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

  const frame = doc.createElement('div')
  frame.className = 'frame'

  const panel = doc.createElement('div')
  panel.className = 'sheet'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'false')
  panel.setAttribute('aria-label', options.label)

  const sections = sectionFlows({
    flows,
    unfinishedId: options.unfinishedId,
    completedIds: options.completedIds,
  })
  const returnFocus = doc.activeElement

  const list = body(doc, sections, options, choose)
  list.className = 'list'
  if (options.onReport) list.appendChild(reportEntry(doc, report))
  const { bar, pill } = toggleBar(doc, options.label, close)
  panel.append(list, bar)
  frame.appendChild(panel)
  root.appendChild(frame)

  // Wholly on screen. If the button sat too high for the panel to open
  // above it, the panel shifts down, and the button will come back there.
  function place(anchor: Anchor): void {
    const safe = clampAnchor(anchor, sizeOf(frame, FALLBACK_SIZE), viewportOf(doc))
    options.position.set(safe)
    placeAt(frame, safe)
  }
  place(options.position.get())

  // Dragged by its bar. A short press still folds it away.
  let dragStart: Anchor = options.position.get()
  const undoDrag = makeDraggable(bar, {
    onStart: () => {
      dragStart = options.position.get()
      bar.classList.add('is-dragging')
    },
    onMove: (dx, dy) => place(dragAnchor(dragStart, dx, dy)),
    onEnd: () => {
      bar.classList.remove('is-dragging')
      options.position.save()
    },
  })

  const motion = allowsMotion(doc)
  const chevron = pill.querySelector('.chevron')
  if (motion) {
    const from = options.from ?? pill.getBoundingClientRect()
    panel.animate([{ clipPath: clipTo(panel, from) }, { clipPath: OPEN_CLIP }], {
      duration: GROW_MS,
      easing: EASE,
    })
    list.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 220, delay: 110, easing: EASE, fill: 'backwards' },
    )
    chevron?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], {
      duration: GROW_MS,
      easing: EASE,
    })
  }

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

  let closed = false

  function close(): void {
    if (closed) return
    closed = true
    doc.removeEventListener('keydown', onKeyDown, true)
    undoDrag()

    if (!motion) {
      finish()
      return
    }
    // Fold back into the pill, then hand over to the button underneath.
    panel.style.pointerEvents = 'none'
    list.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
    chevron?.animate([{ transform: 'rotate(180deg)' }, { transform: 'rotate(0deg)' }], {
      duration: FOLD_MS,
      easing: EASE,
      fill: 'forwards',
    })
    panel
      .animate(
        [{ clipPath: OPEN_CLIP }, { clipPath: clipTo(panel, pill.getBoundingClientRect()) }],
        {
          duration: FOLD_MS,
          easing: EASE,
          fill: 'forwards',
        },
      )
      .finished.then(finish, finish)
    // A browser can hold animations back, in a background tab for one. The
    // panel still has to go, so this does not wait on the animation alone.
    setTimeout(finish, FOLD_MS + 100)
  }

  let finished = false

  function finish(): void {
    if (finished) return
    finished = true
    frame.remove()
    style.remove()
    // Before focus goes back, so the owner can show whatever it hid.
    options.onClose()
    if (returnFocus instanceof HTMLElement) returnFocus.focus()
  }

  function choose(flowId: string): void {
    close()
    options.onChoose(flowId)
  }

  function report(): void {
    close()
    options.onReport?.()
  }

  return { close }
}

function toggleBar(
  doc: Document,
  label: string,
  onClose: () => void,
): { bar: HTMLElement; pill: HTMLElement } {
  const bar = doc.createElement('button')
  bar.type = 'button'
  bar.className = 'bar'
  bar.setAttribute('aria-expanded', 'true')
  bar.addEventListener('click', onClose)

  const pill = doc.createElement('span')
  pill.className = 'pill'
  fillPill(pill, label)
  bar.appendChild(pill)

  return { bar, pill }
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

/** "Something not working? Report a problem", at the foot of the list. */
function reportEntry(doc: Document, onReport: () => void): HTMLElement {
  const row = doc.createElement('p')
  row.className = 'report'
  const ask = doc.createElement('span')
  ask.textContent = 'Something not working?'
  const button = doc.createElement('button')
  button.type = 'button'
  button.textContent = 'Report a problem'
  button.addEventListener('click', onReport)
  row.append(ask, button)
  return row
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
