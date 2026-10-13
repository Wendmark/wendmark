import type { ActionStep, Flow, InputStep, Target } from '@wendmark/core'
import {
  fingerprint,
  findInteractiveTarget,
  getRole,
  isInRepeatedStructure,
  isInteractive,
  pagePath,
} from '@wendmark/dom'
import { createOverlay, OVERLAY_TAG } from '../overlay/overlay'
import { createRecordingBadge } from './badge'

/** A recording longer than this is a mistake, not a process. */
const MAX_STEPS = 60

/** How a recording is set up. */
export interface RecordingOptions {
  doc?: Document
  view?: Window
  name?: string
  /**
   * Told about each step as it is recorded, for a live step list. When
   * `replacesLast` is true the step takes the place of the one before it —
   * a click on a field, superseded by filling it in — and the list should
   * drop that one.
   */
  onStep?: (step: ActionStep | InputStep, change: { replacesLast: boolean }) => void
  /** Whether to ignore clicks for now, so setup does not become steps. */
  isPaused?: () => boolean
  /**
   * Whether to show the "Recording" badge. The recorder panel has its own
   * indicator, so it turns this off rather than showing two.
   */
  showBadge?: boolean
}

/** A recording in progress. */
export interface Recording {
  stop: () => Flow
}

/**
 * A first draft of the instruction, from what the element is and what it is
 * called. Rough on purpose: a person rewrites these afterwards.
 */
/** The wording for a step where the user fills something in. */
function describeInput(target: Target): string {
  const name = target.name ?? target.text
  if (!name) return 'Fill this in'

  switch (target.role) {
    case 'combobox':
    case 'listbox':
      return `Choose a ${name}`
    case 'checkbox':
    case 'switch':
      return `Set ${name}`
    case 'radio':
      return `Choose ${name}`
    default:
      return `Enter your ${name}`
  }
}

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

/**
 * The element the user really touched. Inside a web component, `event.target`
 * is the component itself; the composed path starts with the real element.
 */
function deepTarget(event: Event): Element | null {
  const [first] = event.composedPath()
  if (first instanceof Element) return first
  return event.target instanceof Element ? event.target : null
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

/** Fields a label toggles: clicking the label is the whole of the step. */
function isCheckable(element: Element): boolean {
  return (
    element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')
  )
}

/**
 * The label around (or containing) what was clicked, with the field it is
 * for. A click on a label is forwarded by the browser to that field as a
 * second click, and the field then changes: three events, one intention.
 */
function labelAround(clicked: Element): { label: HTMLLabelElement; field: Element } | null {
  const label = clicked.closest('label')
  const field = label?.control ?? null
  return label && field ? { label, field } : null
}

/**
 * Two clicks on one control closer together than this are one intention.
 *
 * A system double-click is around 500ms; anything slower is somebody
 * pressing a thing again because they meant to.
 */
const SAME_INTENT_MS = 500

/** Starts watching the user's clicks and turning them into steps. */
export function startRecording(options: RecordingOptions = {}): Recording {
  const doc = options.doc ?? document
  const view = options.view ?? window

  const steps: (ActionStep | InputStep)[] = []
  let lastElement: Element | null = null
  let lastClickAt = 0
  let recording = true
  /** A field whose label was just recorded: its echoes are not new steps. */
  let labelled: Element | null = null

  const showBadge = options.showBadge ?? true
  const overlay = showBadge ? createOverlay(doc) : null
  const badge = overlay ? createRecordingBadge(overlay.root, doc) : null

  /**
   * Observe only: capture phase so a click that navigates is still seen,
   * and never preventDefault. Recording must not change what the app does.
   */
  function onClick(event: Event): void {
    if (!recording || steps.length >= MAX_STEPS) return
    if (options.isPaused?.()) return
    const clicked = deepTarget(event)
    if (!clicked) return
    // Never record the user using Wendmark's own controls.
    if (event.composedPath().some(isOurs)) return

    // The click the browser forwards from a label to its field. The label
    // was the step.
    const now = Date.now()
    if (clicked === labelled && now - lastClickAt < SAME_INTENT_MS) return

    let element = findInteractiveTarget(clicked)
    // How the step is worded: by what the field is, when it is a label's.
    let wordedAs: Target['role'] | undefined
    const around = labelAround(clicked)
    if (around && isCheckable(around.field)) {
      // A radio or tick box and its label are one control. Point at the
      // label: it is what the person sees and clicks, and plenty of apps
      // hide the real input behind it.
      element = around.label
      wordedAs = getRole(around.field) ?? undefined
    } else if (around && clicked !== around.field && !around.field.contains(clicked)) {
      // A label's text for any other field just moves the caret there. The
      // forwarded click records the field itself.
      return
    } else if (!isWorthRecording(element)) {
      return
    }

    // A double click, or an impatient second press on a button that has not
    // responded yet, is one step. A later press of the same control is a
    // second step: a quantity stepper clicked three times means three, and
    // recording that as one leaves the person following it with one.
    if (element === lastElement && now - lastClickAt < SAME_INTENT_MS) return
    lastElement = element
    lastClickAt = now
    labelled = wordedAs !== undefined && around ? around.field : null

    const target: Target = { ...fingerprint(element), url: pagePath(view.location.href) }
    const step: ActionStep = {
      type: 'action',
      id: `s${steps.length + 1}`,
      text: describe(wordedAs ? { ...target, role: wordedAs } : target),
      // A click on something in a list is a click on the author's own data,
      // and a step that goes looking for their row in somebody else's
      // account never finds it. Guessed, not decided: the panel shows the
      // guess and the author can disagree.
      dynamic: isInRepeatedStructure(element),
      target,
    }
    steps.push(step)
    options.onStep?.(step, { replacesLast: false })
  }

  /**
   * The user filled something in. That is a step of its own, and usually the
   * same element we just recorded a click on, so the click is replaced.
   * What they put in the field is never read.
   */
  function onChange(event: Event): void {
    if (!recording) return
    if (options.isPaused?.()) return
    const changed = deepTarget(event)
    if (!changed) return
    if (event.composedPath().some(isOurs)) return

    // A radio or tick box whose label was the step: changing is what the
    // click on the label did, not something more to do.
    if (changed === labelled) return

    const element = findInteractiveTarget(changed)
    if (!isWorthRecording(element)) return

    const target: Target = { ...fingerprint(element), url: pagePath(view.location.href) }
    const last = steps[steps.length - 1]
    const replacesLast = last !== undefined && lastElement === element
    if (replacesLast) steps.pop()

    lastElement = element
    lastClickAt = Date.now()
    labelled = null
    const step: InputStep = {
      type: 'input',
      id: `s${steps.length + 1}`,
      text: describeInput(target),
      target,
    }
    steps.push(step)
    options.onStep?.(step, { replacesLast })
  }

  doc.addEventListener('click', onClick, { capture: true, passive: true })
  doc.addEventListener('change', onChange, { capture: true, passive: true })

  return {
    stop: (): Flow => {
      recording = false
      doc.removeEventListener('click', onClick, true)
      doc.removeEventListener('change', onChange, true)
      badge?.destroy()
      overlay?.destroy()
      return {
        schemaVersion: 1,
        id: `recording-${Date.now()}`,
        name: options.name ?? 'Recorded flow',
        steps,
      }
    },
  }
}
