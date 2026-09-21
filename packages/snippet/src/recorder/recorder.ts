import type { ActionStep, Flow, Target } from '@wendmark/core'
import { fingerprint, findInteractiveTarget, getRole, isInteractive } from '@wendmark/dom'
import { createOverlay, OVERLAY_TAG } from '../overlay/overlay'
import { createRecordingBadge } from './badge'

/** A recording longer than this is a mistake, not a process. */
const MAX_STEPS = 60

/** How a recording is set up. */
export interface RecordingOptions {
  doc?: Document
  view?: Window
  name?: string
}

/** A recording in progress. */
export interface Recording {
  stop: () => Flow
}

/**
 * A first draft of the instruction, from what the element is and what it is
 * called. Rough on purpose: a person rewrites these afterwards.
 */
function describe(target: Target): string {
  const name = target.name ?? target.text
  if (!name) return 'Click here'

  switch (target.role) {
    case 'link':
      return `Go to ${name}`
    case 'textbox':
    case 'searchbox':
      return `Click the ${name} field`
    case 'combobox':
    case 'listbox':
      return `Choose a ${name}`
    case 'checkbox':
    case 'switch':
      return `Tick ${name}`
    case 'radio':
      return `Choose ${name}`
    default:
      return `Click ${name}`
  }
}

/** Whether a node is part of Wendmark's own UI. */
function isOurs(node: EventTarget): boolean {
  return node instanceof Element && node.localName === OVERLAY_TAG
}

/**
 * Whether an element is worth recording a step for.
 *
 * Form fields count even when ARIA gives them no role — a password or date
 * field still needs guidance pointing at it. What the user puts in it is
 * never recorded either way.
 */
function isWorthRecording(element: Element): boolean {
  if (element === element.ownerDocument.body) return false
  if (element === element.ownerDocument.documentElement) return false
  if (getRole(element) !== null) return true
  if (isInteractive(element)) return true
  return element.matches('input, select, textarea, button, a[href]')
}

/** Starts watching the user's clicks and turning them into steps. */
export function startRecording(options: RecordingOptions = {}): Recording {
  const doc = options.doc ?? document
  const view = options.view ?? window

  const steps: ActionStep[] = []
  let lastElement: Element | null = null
  let recording = true

  const overlay = createOverlay(doc)
  const badge = createRecordingBadge(overlay.root, doc)

  /**
   * Observe only: capture phase so a click that navigates is still seen,
   * and never preventDefault. Recording must not change what the app does.
   */
  function onClick(event: Event): void {
    if (!recording || steps.length >= MAX_STEPS) return
    if (!(event.target instanceof Element)) return
    // Never record the user using Wendmark's own controls.
    if (event.composedPath().some(isOurs)) return

    const element = findInteractiveTarget(event.target)
    if (!isWorthRecording(element)) return
    // A double click, or a button that does not respond at once, is one step.
    if (element === lastElement) return
    lastElement = element

    const target: Target = { ...fingerprint(element), url: view.location.href }
    steps.push({
      type: 'action',
      id: `s${steps.length + 1}`,
      text: describe(target),
      dynamic: false,
      target,
    })
  }

  doc.addEventListener('click', onClick, { capture: true, passive: true })

  return {
    stop: (): Flow => {
      recording = false
      doc.removeEventListener('click', onClick, true)
      badge.destroy()
      overlay.destroy()
      return {
        schemaVersion: 1,
        id: `recording-${Date.now()}`,
        name: options.name ?? 'Recorded flow',
        steps,
      }
    },
  }
}
