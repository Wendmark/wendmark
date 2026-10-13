/**
 * The shell shared by Wendmark's panels that stay on screen while the user
 * works: the guide's step list and the recorder.
 *
 * A panel with a bar along its bottom. The bar is the pill it folds into:
 * pressing it folds the panel away so the page underneath is reachable,
 * pressing it again grows the panel back. The panel can be dragged by its
 * bar or by any handle the panel adds, and remembers where it was put.
 *
 * Only Wendmark's own controls get listeners here. Nothing touches the page.
 */

import { fillPill, PILL_CSS } from '../launcher/pill'
import {
  clampAnchor,
  dragAnchor,
  placeAt,
  rememberedPosition,
  sizeOf,
  viewportOf,
  type Anchor,
  type Size,
} from './anchor'
import { makeDraggable } from './drag'
import { allowsMotion, clipTo, EASE, FOLD_MS, GROW_MS, OPEN_CLIP } from './morph'

export const SHELL_CSS = `
  ${PILL_CSS}
  /* The shadow sits on a wrapper as a filter, so it follows the clipped
     shape while the panel grows out of its pill or folds back into it. */
  .wm-frame {
    position: fixed;
    max-width: calc(100vw - 16px);
    filter: drop-shadow(0 14px 32px rgba(30, 25, 70, 0.24));
  }
  .wm-sheet {
    position: relative;
    max-height: calc(100vh - 16px);
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
    color: #2a2833;
    font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    /* The one part of the overlay the user may click. */
    pointer-events: auto;
  }
  .wm-handle {
    cursor: grab;
    user-select: none;
    touch-action: none;
  }
  .wm-handle:active { cursor: grabbing; }

  /* The bar: the pill it folds into, stretched to the panel's width. Its
     contents stay on the right, where the folded pill has them. */
  .wm-bar {
    display: flex;
    justify-content: flex-end;
    flex: none;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    cursor: pointer;
    touch-action: none;
    transition: background-color 160ms ease;
  }
  .wm-bar.is-teal { background: #0e5c57; }
  .wm-bar.is-teal:hover { background: #0a4642; }
  .wm-bar.is-dark { background: #1f1d2b; }
  .wm-bar.is-dark:hover { background: #33304a; }
  .wm-bar.is-signal { background: #b8491a; }
  .wm-bar.is-signal:hover { background: #9c3c13; }
  .wm-bar:focus-visible { outline: 2px solid #fff; outline-offset: -4px; border-radius: 12px; }
  .wm-bar.is-dragging { cursor: grabbing; }
  .wm-bar .pill { max-width: 100%; }
  .wm-bar .chevron {
    transform: rotate(180deg);
    transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .wm-sheet.is-folded .wm-bar .chevron { transform: none; }

  /* Folded, only the bar is there: the rest is out of sight, out of the tab
     order and out of reach. It goes once the fold has finished, not before. */
  .wm-sheet > :not(.wm-bar) { transition: visibility 0s linear 0s; }
  .wm-sheet.is-folded > :not(.wm-bar) {
    visibility: hidden;
    transition-delay: 240ms;
  }
  @media (prefers-reduced-motion: reduce) {
    .wm-bar .chevron { transition: none; }
  }
`

export interface ShellOptions {
  /** The sheet's data-wendmark name, e.g. "panel" or "recorder". */
  kind: string
  /** What assistive technology calls the panel. */
  name: string
  /** Width of the open panel, in pixels. */
  width: number
  /** Where the position is remembered. */
  positionKey: string
  /**
   * Teal for guiding, dark for recording, orange for reporting a problem, so
   * none is ever mistaken for another.
   */
  tone: 'teal' | 'dark' | 'signal'
  /** A recording light in the pill. */
  recording?: boolean
  /** Stand-in size of the open panel where nothing is laid out (tests). */
  fallback: Size
}

export interface Shell {
  frame: HTMLElement
  /** Where the panel's own content goes, before the bar. */
  sheet: HTMLElement
  bar: HTMLButtonElement
  pill: HTMLElement
  /** Changes what the pill says. */
  setLabel: (text: string) => void
  isFolded: () => boolean
  setFolded: (folded: boolean) => void
  /** Another part of the panel that drags it, e.g. its header. */
  addHandle: (handle: HTMLElement, ignore?: (target: Element) => boolean) => void
  /** Re-applies the limits after the panel changed size. */
  keepOnScreen: () => void
  /** Grows the panel out of its pill: for when it first appears. */
  grow: () => void
  destroy: () => void
}

const PILL_FALLBACK = { width: 200, height: 40 }

/** The page's local storage, or undefined where the browser refuses it. */
function safeLocalStorage(doc: Document): Storage | undefined {
  try {
    return doc.defaultView?.localStorage
  } catch {
    return undefined
  }
}

/** Builds the shell inside a shadow root. The caller fills `sheet`. */
export function createShell(root: ShadowRoot, doc: Document, options: ShellOptions): Shell {
  const frame = doc.createElement('div')
  frame.className = 'wm-frame'
  frame.style.width = `${options.width}px`

  const sheet = doc.createElement('div')
  sheet.className = 'wm-sheet'
  sheet.dataset.wendmark = options.kind
  sheet.setAttribute('role', 'region')
  sheet.setAttribute('aria-label', options.name)

  const bar = doc.createElement('button')
  bar.type = 'button'
  bar.className = `wm-bar is-${options.tone}`
  bar.setAttribute('aria-expanded', 'true')
  const pill = doc.createElement('span')
  pill.className = 'pill'
  const label = fillPill(pill, '', { recording: options.recording === true })
  bar.appendChild(pill)

  sheet.appendChild(bar)
  frame.appendChild(sheet)
  root.appendChild(frame)

  const position = rememberedPosition(safeLocalStorage(doc), options.positionKey)
  const motion = allowsMotion(doc)
  let folded = false

  /** Keeps whatever is showing wholly on screen: the panel, or just its pill. */
  function place(anchor: Anchor): void {
    const visible = folded ? sizeOf(pill, PILL_FALLBACK) : sizeOf(frame, options.fallback)
    const safe = clampAnchor(anchor, visible, viewportOf(doc))
    position.set(safe)
    placeAt(frame, safe)
  }

  function keepOnScreen(): void {
    place(position.get())
    // A folded panel's pill can change width with its label.
    if (folded) sheet.style.clipPath = clipTo(sheet, pill.getBoundingClientRect())
  }

  let dragStart: Anchor = position.get()
  const undos: (() => void)[] = []

  function addHandle(handle: HTMLElement, ignore?: (target: Element) => boolean): void {
    if (handle !== bar) handle.classList.add('wm-handle')
    undos.push(
      makeDraggable(handle, {
        onStart: () => {
          dragStart = position.get()
          bar.classList.add('is-dragging')
        },
        onMove: (dx, dy) => place(dragAnchor(dragStart, dx, dy)),
        onEnd: () => {
          bar.classList.remove('is-dragging')
          position.save()
        },
        ...(ignore ? { ignore } : {}),
      }),
    )
  }

  function setFolded(next: boolean): void {
    if (next === folded) return
    const pillBefore = pill.getBoundingClientRect()
    folded = next
    sheet.classList.toggle('is-folded', folded)
    bar.setAttribute('aria-expanded', String(!folded))
    // Unfolding near the top may need the panel to shift to fit.
    place(position.get())

    const pillClip = clipTo(sheet, folded ? pill.getBoundingClientRect() : pillBefore)
    sheet.style.clipPath = folded ? pillClip : ''
    if (motion) {
      sheet.animate(
        [{ clipPath: folded ? OPEN_CLIP : pillClip }, { clipPath: folded ? pillClip : OPEN_CLIP }],
        { duration: folded ? FOLD_MS : GROW_MS, easing: EASE },
      )
    }
  }

  // A short press on the bar folds or unfolds; a drag on it moves the panel.
  bar.addEventListener('click', () => setFolded(!folded))
  addHandle(bar)

  const view = doc.defaultView
  view?.addEventListener('resize', keepOnScreen)
  place(position.get())

  return {
    frame,
    sheet,
    bar,
    pill,
    setLabel: (text) => {
      label.textContent = text
      if (folded) keepOnScreen()
    },
    isFolded: () => folded,
    setFolded,
    addHandle,
    keepOnScreen,
    grow: () => {
      if (!motion || folded) return
      sheet.animate(
        [{ clipPath: clipTo(sheet, pill.getBoundingClientRect()) }, { clipPath: OPEN_CLIP }],
        { duration: GROW_MS, easing: EASE },
      )
    },
    destroy: () => {
      for (const undo of undos) undo()
      view?.removeEventListener('resize', keepOnScreen)
      frame.remove()
    },
  }
}
