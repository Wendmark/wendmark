/**
 * Guidance-only playback. The player never clicks or types for the user —
 * it highlights the target and waits for the user's own click to advance.
 * No network calls happen during playback.
 */
import type { Process, Step } from '../types'
import { Overlay } from './overlay'
import {
  resolveTarget,
  resolveDynamicTargets,
  commonAncestorDeep,
  urlMatches,
  prettyPath,
  isVisible,
} from './resolve'
import { collectCandidates } from './snapshot'
import { savePlayback, clearPlayback } from './state'

/** Quiet attempts ("Looking for this step…") before showing a blocked hint. */
const QUICK_ATTEMPTS = 6
const QUICK_INTERVAL_MS = 500
/** After that, keep retrying in the background while the hint is shown. */
const SLOW_INTERVAL_MS = 1200

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class Player {
  private overlay: Overlay | null = null
  private process: Process | null = null
  private stepIndex = 0
  /** All clickable targets for the current step (several for dynamic steps). */
  private targets: Element[] = []
  /** The element the highlight ring wraps (the group container for dynamic steps). */
  private anchor: Element | null = null
  /** Bumped to cancel any in-flight resolution loop. */
  private runId = 0
  /** Element the AI rescue picked — consumed by the resolution loop. */
  private aiTarget: Element | null = null
  /** AI says its pick only REVEALS the target (menu toggle) — don't advance on it. */
  private aiReveals = false
  private aiState: 'asking' | 'failed' | 'unavailable' | null = null
  private aiError = ''
  /** Elements the user flagged as wrong for the current step. */
  private rejected = new Set<Element>()
  /** Live tracker: follows the target through layout shifts and re-renders. */
  private watchTimer: ReturnType<typeof setInterval> | null = null

  async start(process: Process, stepIndex = 0): Promise<void> {
    this.teardown()
    this.process = process
    this.stepIndex = stepIndex
    this.overlay = new Overlay(() => this.stop())
    this.overlay.setProcess(process)
    await savePlayback({ process, stepIndex })
    void this.showStep()
  }

  stop(): void {
    this.teardown()
    void clearPlayback()
  }

  private async showStep(): Promise<void> {
    const runId = ++this.runId
    const process = this.process
    if (!process) return
    const step = process.steps[this.stepIndex]
    const stepNo = this.stepIndex + 1
    const total = process.steps.length

    this.detachTarget()
    this.aiTarget = null
    this.aiState = null
    this.overlay?.showSearching(step.instruction, stepNo, total)

    // Always try to resolve the element first — the URL is only a hint.
    // Quiet retries cover slow renders; after that a blocked hint is shown
    // (wrong page vs. missing state) while retries continue indefinitely,
    // so guidance resumes by itself once the user navigates or sets up the
    // state. Skip and Stop stay available the whole time.
    let targets: Element[] = []
    let lastStatus = ''
    for (let attempt = 0; ; attempt++) {
      // An AI-rescued element wins the round it arrives in.
      let interim = false
      if (this.aiTarget) {
        targets = [this.aiTarget]
        interim = this.aiReveals
      } else if (step.dynamic) {
        targets = resolveDynamicTargets(step)
      } else {
        const t = resolveTarget(step)
        targets = t ? [t] : []
      }
      this.aiTarget = null
      this.aiReveals = false
      // Skip anything the user flagged as wrong for this step.
      targets = targets.filter((t) => !this.rejected.has(t))
      if (runId !== this.runId) break
      if (targets.length > 0) {
        this.applyTargets(targets, step, stepNo, total, interim)
        return
      }

      if (attempt === QUICK_ATTEMPTS) {
        console.warn(
          `[Wend] Could not resolve step ${stepNo}/${total} yet — retrying.`,
          `selector: ${step.selector}`,
          `text fallback: ${JSON.stringify(step.text)}`,
        )
      }
      if (attempt >= QUICK_ATTEMPTS) {
        const status = this.blockedStatus(step)
        if (status !== lastStatus) {
          this.overlay?.showNotFound(
            step.instruction,
            stepNo,
            total,
            () => void this.advance(),
            status,
            this.aiState === 'asking' ? null : () => void this.aiRescue(step, runId),
          )
          lastStatus = status
        }
      }
      await sleep(attempt < QUICK_ATTEMPTS ? QUICK_INTERVAL_MS : SLOW_INTERVAL_MS)
    }
  }

  /**
   * Highlight the resolved target(s) and wait for the user's click.
   * Single target: ring it. Dynamic group: ring the enclosing container and
   * advance on a click on ANY item. Interim (AI "reveals") target: ring it
   * but do NOT advance on click — re-resolve the real step instead.
   */
  private applyTargets(
    targets: Element[],
    step: Step,
    stepNo: number,
    total: number,
    interim: boolean,
  ): void {
    this.targets = targets
    this.anchor = targets.length === 1 ? targets[0] : commonAncestorDeep(targets)
    this.anchor.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // Capture phase so the click registers even when it triggers a navigation.
    const handler = interim ? this.onInterimClick : this.onTargetClick
    for (const t of targets) {
      t.addEventListener('click', handler, { capture: true, once: true })
    }
    window.addEventListener('scroll', this.reposition, true)
    window.addEventListener('resize', this.reposition)
    // Layout shifts (menus opening, panels resizing) and SPA re-renders don't
    // fire scroll/resize — poll the target's position, and if the element
    // vanished or was re-rendered, re-resolve the step automatically.
    let misses = 0
    this.watchTimer = setInterval(() => {
      const anchor = this.anchor
      if (!anchor) return
      if (!anchor.isConnected || !isVisible(anchor)) {
        // Two consecutive misses before restarting, so a mid-animation
        // flicker doesn't churn the step.
        if (++misses >= 2) void this.showStep()
        return
      }
      misses = 0
      this.overlay?.position(anchor.getBoundingClientRect())
    }, 250)
    this.overlay?.showStep(this.anchor.getBoundingClientRect(), step.instruction, stepNo, total, {
      status: interim
        ? 'The target is probably inside here — open it and guidance will continue.'
        : undefined,
      onSkip: () => void this.advance(),
      onWrong: () => this.rejectCurrent(),
    })
  }

  /** User says the highlight is wrong: blacklist it and re-resolve. */
  private rejectCurrent(): void {
    for (const t of this.targets) this.rejected.add(t)
    void this.showStep()
  }

  private blockedStatus(step: Step): string {
    if (this.aiState === 'asking') return 'Asking AI to locate this element…'
    if (this.aiState === 'failed') {
      return "AI couldn't find a match on this screen either — the app is probably in a " +
        'different state. Complete the earlier steps, or skip this one.'
    }
    if (this.aiState === 'unavailable') return `AI lookup unavailable (${this.aiError}).`
    const wrongPage = step.url ? !urlMatches(step.url, location.href) : false
    return wrongPage
      ? `This step happens on a different page (${prettyPath(step.url!)}). ` +
        'Navigate there and guidance will continue automatically.'
      : "Can't find this step yet. The app may be in a different state than when " +
        'it was recorded (e.g. nothing selected) — set that up and guidance will ' +
        'continue automatically, skip it, or ask AI to find it.'
  }

  /** Opt-in AI rescue: only ever runs when the user clicks the button. */
  private async aiRescue(step: Step, runId: number): Promise<void> {
    if (this.aiState === 'asking') return
    this.aiState = 'asking'
    try {
      const { elements, descs } = collectCandidates()
      const resp = (await chrome.runtime.sendMessage({
        type: 'WEND_AI_LOCATE',
        step,
        candidates: descs,
      })) as { ok: boolean; index?: number | null; reveals?: boolean; error?: string }
      if (runId !== this.runId) return
      if (resp?.ok && typeof resp.index === 'number' && elements[resp.index]) {
        this.aiTarget = elements[resp.index]
        this.aiReveals = resp.reveals === true
        this.aiState = null
      } else if (resp?.ok) {
        this.aiState = 'failed'
      } else {
        this.aiState = 'unavailable'
        this.aiError = resp?.error ?? 'request failed'
      }
    } catch {
      if (runId === this.runId) this.aiState = 'failed'
    }
  }

  private onTargetClick = (): void => {
    void this.advance()
  }

  /** Click on an AI "reveals" target (e.g. a menu toggle): re-resolve the
   * real step after giving the revealed content a moment to render. */
  private onInterimClick = (): void => {
    setTimeout(() => void this.showStep(), 400)
  }

  private reposition = (): void => {
    if (this.anchor) this.overlay?.position(this.anchor.getBoundingClientRect())
  }

  private async advance(): Promise<void> {
    const process = this.process
    if (!process) return
    this.detachTarget()
    this.rejected.clear()
    this.stepIndex++

    if (this.stepIndex >= process.steps.length) {
      this.runId++
      void clearPlayback()
      const overlay = this.overlay
      overlay?.showDone(process.name)
      this.overlay = null
      this.process = null
      setTimeout(() => overlay?.destroy(), 2500)
      return
    }

    // Persist before the click's navigation (if any) unloads this page, so
    // the next page's content script resumes at the right step.
    await savePlayback({ process, stepIndex: this.stepIndex })
    void this.showStep()
  }

  private teardown(): void {
    this.runId++
    this.detachTarget()
    this.rejected.clear()
    this.overlay?.destroy()
    this.overlay = null
    this.process = null
    this.stepIndex = 0
  }

  private detachTarget(): void {
    if (this.watchTimer !== null) {
      clearInterval(this.watchTimer)
      this.watchTimer = null
    }
    for (const t of this.targets) {
      t.removeEventListener('click', this.onTargetClick, true)
      t.removeEventListener('click', this.onInterimClick, true)
    }
    this.targets = []
    this.anchor = null
    window.removeEventListener('scroll', this.reposition, true)
    window.removeEventListener('resize', this.reposition)
  }
}
