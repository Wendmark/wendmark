import type { Step } from '@wendmark/core'
import { maskPath, redactStep, type LabelPolicy } from '@wendmark/core/redact'
import { pagePath } from '@wendmark/dom'
import { createOverlay } from '../overlay/overlay'
import { REPORT_VERSION, sendReport } from '../portal/client'
import { startRecording, type Recording, type RecordingOptions } from '../recorder/recorder'
import { createReportPanel } from './panel'

/**
 * "Report a problem": the person redoes what went wrong, Wendmark notes which
 * controls they pressed, they say what happened, and it goes to the portal.
 *
 * User-initiated and structural, never a recording of the screen: nothing is
 * noted before they start or after they press Done, the recorder never reads
 * what anyone types, and every step is masked by the app's label policy
 * before the person sees it. The portal masks it again on its side. See
 * docs/decisions/problem-reports.md.
 *
 * Only ever observes. It clicks nothing and changes nothing on the page.
 */

export interface ReportOptions {
  portalOrigin: string
  appKey: string
  /** How much of what the page says a report may keep, from the portal. */
  labels: LabelPolicy
  snippetVersion: string
  /** An identifier the app itself passed in, sent as given. */
  userRef?: string
  doc?: Document
  view?: Window
  /** Gone from the page, sent or not. */
  onEnd?: () => void
  /** Injected in tests. */
  record?: (options: RecordingOptions) => Recording
}

export interface ProblemReport {
  /** Closes it without sending anything. */
  cancel: () => void
}

/** Never more than this: the portal would turn a longer one away. */
const MAX_STEPS = 60

export function startProblemReport(options: ReportOptions): ProblemReport {
  const doc = options.doc ?? document
  const view = options.view ?? window
  const record = options.record ?? startRecording
  const policy = options.labels

  const overlay = createOverlay(doc)
  let steps: Step[] = []
  // The page they started on is part of what happened, even before a click.
  const firstPage = pagePath(view.location.href)
  let recording: Recording | null = null
  let ended = false

  const panel = createReportPanel(overlay.root, doc, {
    onDone: () => {
      stopNoting()
      show('describe')
    },
    onBack: () => {
      startNoting()
      show('retrace')
    },
    onRemove: (index) => {
      steps = steps.filter((_, i) => i !== index)
      show(stage)
    },
    onSend: (note) => void send(note),
    onClose: () => end(),
  })

  let stage: 'retrace' | 'describe' | 'sending' | 'sent' | 'failed' = 'retrace'
  function show(next: typeof stage): void {
    stage = next
    panel.render({ stage, steps })
  }

  function startNoting(): void {
    recording = record({
      doc,
      view,
      showBadge: false,
      onStep: (step, { replacesLast }) => {
        // Masked the moment it is noted, so the unmasked labels never reach
        // the panel and never sit in memory longer than this line.
        const masked = redactStep(step, policy)
        if (replacesLast) steps = steps.slice(0, -1)
        if (steps.length >= MAX_STEPS) return
        steps = [...steps, masked]
        if (stage === 'retrace') show('retrace')
      },
    })
  }

  function stopNoting(): void {
    recording?.stop()
    recording = null
  }

  /** The pages they passed through, in order, each once in a row. */
  function pages(): string[] {
    const seen = [
      firstPage,
      ...steps.map((step) => (step.type === 'instruction' ? null : step.target.url)),
    ]
    const visited: string[] = []
    for (const page of seen) {
      if (!page) continue
      const shown = policy === 'all' ? page : maskPath(page)
      if (visited[visited.length - 1] !== shown) visited.push(shown)
    }
    return visited
  }

  async function send(note: string): Promise<void> {
    if (note === '' || steps.length === 0 || stage === 'sending') return
    show('sending')
    const sent = await sendReport(
      options.portalOrigin,
      options.appKey,
      {
        reportVersion: REPORT_VERSION,
        note,
        steps,
        pages: pages(),
        labels: policy,
        userAgent: view.navigator.userAgent.slice(0, 400),
        snippetVersion: options.snippetVersion,
        ...(options.userRef ? { userRef: options.userRef.slice(0, 200) } : {}),
      },
      view,
    )
    if (ended) return
    show(sent ? 'sent' : 'failed')
  }

  function end(): void {
    if (ended) return
    ended = true
    stopNoting()
    panel.destroy()
    overlay.destroy()
    options.onEnd?.()
  }

  startNoting()
  show('retrace')

  return { cancel: end }
}
