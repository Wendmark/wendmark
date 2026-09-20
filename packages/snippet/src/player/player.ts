import type { Flow } from '@wendmark/core'
import { resolve } from '@wendmark/dom'
import { createHighlighter } from '../overlay/highlighter'
import { createPanel } from './panel'
import { clearProgress, saveProgress } from './progress'

/** Shown while a step's target cannot be found on the page. */
const NOT_FOUND_STATUS =
  "Can't find this step on the page yet. Skip it, or set the page up and it will continue."

/** Shown on a step where the user picks one item out of several. */
const CHOOSE_STATUS = 'Choose any one of the highlighted items.'

/** Shown during the first, quiet attempts, while the page may still be rendering. */
const SEARCHING_STATUS = 'Looking for this step…'

/** Quiet attempts before admitting we are stuck. */
export const QUICK_ATTEMPTS = 6
export const QUICK_INTERVAL_MS = 500

/** After that, keep looking in the background, less often. */
export const SLOW_INTERVAL_MS = 1200

/** How a flow is played, and who to tell when it ends. */
export interface PlayerOptions {
  doc?: Document
  view?: Window
  /** Where to start, when picking a flow up after a page load. */
  startIndex?: number
  /** Where progress is remembered. Defaults to the page's session storage. */
  storage?: Storage
  onFinish?: () => void
  onStop?: () => void
}

/** A flow being played. */
export interface Player {
  stop: (options?: { keepProgress?: boolean }) => void
}

/** The page's session storage, or undefined where the browser refuses it. */
function safeSessionStorage(view: Window): Storage | undefined {
  try {
    return view.sessionStorage
  } catch {
    return undefined
  }
}

/** Starts guiding a user through a flow. */
export function startFlow(flow: Flow, options: PlayerOptions = {}): Player {
  const doc = options.doc ?? document
  const view = options.view ?? window

  const storage = options.storage ?? safeSessionStorage(view)

  let index = options.startIndex ?? 0
  let targets: Element[] = []
  let running = true
  let attempt = 0
  let retryTimer: ReturnType<Window['setTimeout']> | null = null

  function stopRetrying(): void {
    if (retryTimer !== null) {
      view.clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const highlighter = createHighlighter(doc, view, {
    // The target vanished: look for this step again on the page as it is now.
    onLost: () => showStep(),
  })
  const panel = createPanel(highlighter.root, doc, {
    onSkip: () => advance(),
    onStop: () => stop(),
    onPrimary: () => advance(),
  })

  /** The nearest element containing all of a group, so one ring covers them. */
  function commonAncestor(elements: Element[]): Element | null {
    const [first, ...rest] = elements
    let ancestor: Element | null = first ?? null
    while (ancestor && rest.some((element) => !ancestor?.contains(element))) {
      ancestor = ancestor.parentElement
    }
    return ancestor
  }

  /**
   * Watch the user's own clicks. Capture phase so the step still registers
   * when the click causes a navigation, and we never call preventDefault:
   * this listener only observes.
   */
  function onClick(event: Event): void {
    if (!running || targets.length === 0) return
    const clicked = event.target
    if (!(clicked instanceof Node)) return
    const hit = targets.some((element) => element === clicked || element.contains(clicked))
    if (hit) advance()
  }

  function showStep(): void {
    if (!running) return
    stopRetrying()
    attempt = 0

    const step = flow.steps[index]
    if (!step) {
      finish()
      return
    }

    targets = []
    // Remembered before anything else, so a click that navigates away still
    // leaves the next page knowing where we were.
    saveProgress(storage, { flowId: flow.id, stepIndex: index })
    panel.show({
      stepNumber: index + 1,
      total: flow.steps.length,
      text: step.text,
      // An instruction step has nothing to click on the page, so the panel
      // carries the way forward.
      ...(step.type === 'instruction' ? { primary: 'Got it' } : {}),
    })

    if (step.type !== 'action') {
      highlighter.clear()
      return
    }
    lookForTarget()
  }

  /**
   * Look for the current step's target, and keep looking until it turns up.
   * Pages render late, and users arrive at the right screen in their own
   * time, so guidance waits rather than failing.
   */
  function lookForTarget(): void {
    if (!running) return
    const step = flow.steps[index]
    if (!step || step.type !== 'action') return

    const result = resolve(step.target, doc)

    if (result.status === 'found') {
      stopRetrying()
      targets = [result.element]
      panel.setStatus('')
      highlighter.highlight(result.element, { label: step.text })
      return
    }

    // Several equally good matches. For a step that targets the user's own
    // data ("pick one of your coffees") that is the right answer: ring the
    // group and let them choose. For fixed UI it means something is unclear,
    // so keep looking rather than guessing.
    if (result.status === 'ambiguous' && step.dynamic) {
      const group = commonAncestor(result.elements)
      if (group) {
        stopRetrying()
        targets = result.elements
        panel.setStatus(CHOOSE_STATUS)
        highlighter.highlight(group, { label: step.text })
        return
      }
    }

    highlighter.clear()
    panel.setStatus(attempt < QUICK_ATTEMPTS ? SEARCHING_STATUS : NOT_FOUND_STATUS)
    const wait = attempt < QUICK_ATTEMPTS ? QUICK_INTERVAL_MS : SLOW_INTERVAL_MS
    attempt += 1
    retryTimer = view.setTimeout(lookForTarget, wait)
  }

  function advance(): void {
    if (!running) return
    index += 1
    if (index >= flow.steps.length) finish()
    else showStep()
  }

  function teardown(keepProgress = false): void {
    if (!running) return
    running = false
    if (!keepProgress) clearProgress(storage)
    stopRetrying()
    targets = []
    doc.removeEventListener('click', onClick, true)
    panel.destroy()
    highlighter.destroy()
  }

  function finish(): void {
    teardown()
    options.onFinish?.()
  }

  function stop(stopOptions: { keepProgress?: boolean } = {}): void {
    teardown(stopOptions.keepProgress === true)
    options.onStop?.()
  }

  doc.addEventListener('click', onClick, true)
  showStep()

  return { stop }
}
