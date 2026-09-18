/**
 * All guidance UI lives inside a shadow root attached to a custom element we
 * inject, so the host page's CSS cannot leak in. The host is pointer-events:
 * none — only the steps panel accepts clicks (drag, Skip, AI, Stop). The
 * highlight ring and cursor never intercept clicks, so the user clicks the
 * real element through them.
 *
 * UI parts:
 *  - Steps panel: draggable checklist of ALL steps (done / current / next),
 *    docked left by default; position persists across pages.
 *  - Highlight ring around the current target.
 *  - Animated guide cursor with a "Click here" chip and click ripple.
 */
import type { Process } from '../types'

export const OVERLAY_TAG = 'wend-overlay'

const RING_PAD = 5
const PANEL_POS_KEY = 'wend:panelPos'

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; margin: 0; }

/* ---------- highlight ring ---------- */
.ring {
  position: fixed;
  border: 2px solid #7b6cf6;
  border-radius: 10px;
  pointer-events: none;
  animation: wend-glow 1.8s ease-in-out infinite;
  transition: top 0.12s ease, left 0.12s ease, width 0.12s ease, height 0.12s ease;
}
@keyframes wend-glow {
  0%, 100% { box-shadow: 0 0 0 4px rgba(123, 108, 246, 0.22), 0 0 20px rgba(123, 108, 246, 0.45); }
  50% { box-shadow: 0 0 0 7px rgba(123, 108, 246, 0.12), 0 0 26px rgba(123, 108, 246, 0.6); }
}

/* ---------- guide cursor ---------- */
.cursor { position: fixed; left: 0; top: 0; pointer-events: none; filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.45)); }
.cursor.glide { transition: left 0.65s cubic-bezier(0.22, 0.61, 0.36, 1), top 0.65s cubic-bezier(0.22, 0.61, 0.36, 1); }
.cursor svg { display: block; transform-origin: 6px 3px; animation: wend-tap 1.6s ease-in-out infinite; }
.ripple {
  position: absolute; left: -1px; top: -4px;
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(139, 123, 255, 0.9);
  animation: wend-ping 1.6s ease-out infinite;
}
@keyframes wend-ping {
  0%, 30% { transform: scale(0.4); opacity: 0; }
  40% { opacity: 0.9; }
  100% { transform: scale(2.4); opacity: 0; }
}
.chip {
  position: absolute; left: 26px; top: 24px;
  background: rgba(255, 255, 255, 0.95);
  color: #5a48e8;
  font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  border-radius: 999px; padding: 7px 13px; white-space: nowrap;
  border: 1px solid rgba(90, 72, 232, 0.35);
  box-shadow: 0 4px 14px rgba(90, 72, 232, 0.3);
  animation: wend-bob 1.6s ease-in-out infinite;
}
.cursor.flip .chip { left: -8px; transform: translateX(-100%); }
@keyframes wend-tap { 0%, 100% { transform: scale(1); } 12% { transform: scale(0.82); } 24% { transform: scale(1); } }
@keyframes wend-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -3px; } }

/* ---------- steps panel ---------- */
.panel {
  position: fixed;
  left: 16px; top: 90px;
  width: 300px;
  max-height: min(70vh, 640px);
  display: flex; flex-direction: column;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(30, 25, 70, 0.22);
  color: #2a2833;
  font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  pointer-events: auto;
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px 10px;
  cursor: grab;
  user-select: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
}
.panel-header:active { cursor: grabbing; }
.grip { color: #a5a1b3; font-size: 12px; letter-spacing: 2px; }
.panel-title {
  flex: 1; min-width: 0;
  font-size: 13px; font-weight: 700;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.progress { font-size: 11px; color: #5a48e8; font-weight: 600; flex-shrink: 0; }
.close {
  cursor: pointer; background: none; border: none;
  color: #a5a1b3; font-size: 14px; line-height: 1; padding: 2px 4px; flex-shrink: 0;
}
.close:hover { color: #2a2833; }

.steps { overflow-y: auto; padding: 8px; }
.step {
  display: flex; gap: 10px;
  padding: 8px 9px;
  border-radius: 10px;
  color: #8f8c9c;
}
.step .marker {
  flex-shrink: 0;
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  background: #eeedf4; color: #8f8c9c;
  margin-top: 1px;
}
.step .body { flex: 1; min-width: 0; }
.step .text { font-size: 13px; }
.step.done { color: #b3b0bf; }
.step.done .text { text-decoration: line-through; text-decoration-color: rgba(0,0,0,0.25); }
.step.done .marker { background: rgba(70, 167, 88, 0.14); color: #2f9e4f; }
.step.current {
  background: rgba(123, 108, 246, 0.1);
  color: #2a2833;
  outline: 1px solid rgba(123, 108, 246, 0.35);
}
.step.current .marker { background: linear-gradient(135deg, #8b7bff, #5a48e8); color: #ffffff; }
.step.current .text { font-weight: 600; }

.step-status { margin-top: 6px; font-size: 12px; color: #b0790a; }
.step-status.ok { color: #5a48e8; }
.step-actions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.btn {
  border: none; border-radius: 7px;
  padding: 5px 11px; font-size: 12px; cursor: pointer; color: #2a2833;
  background: #eeedf4;
}
.btn:hover { background: #e2e0ec; }
.btn.ai { background: linear-gradient(135deg, #8b7bff, #5a48e8); color: #ffffff; }
.btn.ai:hover { filter: brightness(1.1); }
.btn.subtle {
  background: transparent;
  color: #8f8c9c;
  border: 1px solid rgba(0, 0, 0, 0.14);
  padding: 3px 9px;
  font-size: 11px;
}
.btn.subtle:hover { background: rgba(0, 0, 0, 0.05); color: #2a2833; }

.hidden { display: none !important; }
`

const CURSOR_SVG = `
<svg width="28" height="30" viewBox="0 0 28 30" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wend-cursor-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#ece9ff"/>
    </linearGradient>
  </defs>
  <path d="M6 2.5v21l5.4-4.9 3.2 7.1 3.9-1.8-3.2-6.9 7.4-.3z"
        fill="url(#wend-cursor-grad)" stroke="#5a48e8" stroke-width="1.8" stroke-linejoin="round"/>
</svg>`

interface StepRow {
  root: HTMLElement
  marker: HTMLElement
  status: HTMLElement
  actions: HTMLElement
}

export class Overlay {
  private host: HTMLElement
  private ring: HTMLElement
  private cursor: HTMLElement
  private chip: HTMLElement
  private panel: HTMLElement
  private title: HTMLElement
  private progress: HTMLElement
  private stepsBox: HTMLElement
  private rows: StepRow[] = []
  private total = 0

  constructor(onStop: () => void) {
    this.host = document.createElement(OVERLAY_TAG)
    this.host.style.cssText =
      'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;'
    const root = this.host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = STYLE
    root.appendChild(style)

    this.ring = document.createElement('div')
    this.ring.className = 'ring hidden'
    root.appendChild(this.ring)

    this.cursor = document.createElement('div')
    this.cursor.className = 'cursor hidden'
    this.cursor.innerHTML = CURSOR_SVG
    const ripple = document.createElement('span')
    ripple.className = 'ripple'
    this.cursor.appendChild(ripple)
    this.chip = document.createElement('span')
    this.chip.className = 'chip'
    this.chip.textContent = 'Click here'
    this.cursor.appendChild(this.chip)
    root.appendChild(this.cursor)

    // ---- panel ----
    this.panel = document.createElement('div')
    this.panel.className = 'panel'
    const header = document.createElement('div')
    header.className = 'panel-header'
    const grip = document.createElement('span')
    grip.className = 'grip'
    grip.textContent = '⋮⋮'
    this.title = document.createElement('span')
    this.title.className = 'panel-title'
    this.progress = document.createElement('span')
    this.progress.className = 'progress'
    const close = document.createElement('button')
    close.className = 'close'
    close.textContent = '✕'
    close.title = 'Stop guidance'
    close.addEventListener('click', onStop)
    header.append(grip, this.title, this.progress, close)

    this.stepsBox = document.createElement('div')
    this.stepsBox.className = 'steps'
    this.panel.append(header, this.stepsBox)
    root.appendChild(this.panel)

    this.makeDraggable(header)
    void this.restorePanelPosition()
    document.documentElement.appendChild(this.host)
  }

  /** Render the full step list for this process. */
  setProcess(process: Process): void {
    this.title.textContent = process.name
    this.total = process.steps.length
    this.stepsBox.textContent = ''
    this.rows = process.steps.map((step, i) => {
      const root = document.createElement('div')
      root.className = 'step'
      const marker = document.createElement('div')
      marker.className = 'marker'
      marker.textContent = String(i + 1)
      const body = document.createElement('div')
      body.className = 'body'
      const text = document.createElement('div')
      text.className = 'text'
      text.textContent = step.instruction
      const status = document.createElement('div')
      status.className = 'step-status hidden'
      const actions = document.createElement('div')
      actions.className = 'step-actions hidden'
      body.append(text, status, actions)
      root.append(marker, body)
      this.stepsBox.appendChild(root)
      return { root, marker, status, actions }
    })
  }

  showSearching(_instruction: string, stepNo: number, total: number): void {
    this.setCurrent(stepNo, total, 'Looking for this step…', 'ok')
    this.ring.classList.add('hidden')
    this.cursor.classList.add('hidden')
  }

  showStep(
    rect: DOMRect,
    _instruction: string,
    stepNo: number,
    total: number,
    opts?: { status?: string; onSkip?: () => void; onWrong?: () => void },
  ): void {
    this.setCurrent(stepNo, total, opts?.status ?? null, 'ok')
    const row = this.rows[stepNo - 1]
    if (row && (opts?.onSkip || opts?.onWrong)) {
      row.actions.textContent = ''
      if (opts.onWrong) {
        const wrongBtn = document.createElement('button')
        wrongBtn.className = 'btn subtle'
        wrongBtn.textContent = 'Wrong element?'
        wrongBtn.addEventListener('click', opts.onWrong)
        row.actions.appendChild(wrongBtn)
      }
      if (opts.onSkip) {
        const skipBtn = document.createElement('button')
        skipBtn.className = 'btn subtle'
        skipBtn.textContent = 'Skip'
        skipBtn.addEventListener('click', opts.onSkip)
        row.actions.appendChild(skipBtn)
      }
      row.actions.classList.remove('hidden')
    }
    this.ring.classList.remove('hidden')
    this.position(rect)
    this.moveCursor(rect, true)
  }

  showNotFound(
    _instruction: string,
    stepNo: number,
    total: number,
    onSkip: () => void,
    status = "Can't find this step on the page.",
    onAi: (() => void) | null = null,
  ): void {
    this.setCurrent(stepNo, total, status)
    this.ring.classList.add('hidden')
    this.cursor.classList.add('hidden')

    const row = this.rows[stepNo - 1]
    if (!row) return
    row.actions.textContent = ''
    if (onAi) {
      const aiBtn = document.createElement('button')
      aiBtn.className = 'btn ai'
      aiBtn.textContent = '🪄 Ask AI to find it'
      aiBtn.addEventListener('click', onAi)
      row.actions.appendChild(aiBtn)
    }
    const skipBtn = document.createElement('button')
    skipBtn.className = 'btn'
    skipBtn.textContent = 'Skip this step'
    skipBtn.addEventListener('click', onSkip)
    row.actions.appendChild(skipBtn)
    row.actions.classList.remove('hidden')
  }

  showDone(_processName: string): void {
    for (const row of this.rows) this.markDone(row)
    this.progress.textContent = '🎉 Done'
    this.ring.classList.add('hidden')
    this.cursor.classList.add('hidden')
  }

  /** Reposition ring and cursor for the target's current rect. */
  position(rect: DOMRect): void {
    this.ring.style.left = `${rect.left - RING_PAD}px`
    this.ring.style.top = `${rect.top - RING_PAD}px`
    this.ring.style.width = `${rect.width + RING_PAD * 2}px`
    this.ring.style.height = `${rect.height + RING_PAD * 2}px`
    if (!this.cursor.classList.contains('hidden')) this.moveCursor(rect, false)
  }

  destroy(): void {
    this.host.remove()
  }

  // ---- internals ----

  private setCurrent(stepNo: number, total: number, status: string | null, tone = ''): void {
    this.progress.textContent = `${stepNo} / ${total || this.total}`
    this.rows.forEach((row, i) => {
      row.root.classList.remove('current')
      row.actions.classList.add('hidden')
      row.status.classList.add('hidden')
      if (i < stepNo - 1) this.markDone(row)
      else {
        row.root.classList.remove('done')
        row.marker.textContent = String(i + 1)
      }
    })
    const row = this.rows[stepNo - 1]
    if (!row) return
    row.root.classList.add('current')
    if (status !== null) {
      row.status.textContent = status
      row.status.className = `step-status${tone === 'ok' ? ' ok' : ''}`
    }
    row.root.scrollIntoView({ block: 'nearest' })
  }

  private markDone(row: StepRow): void {
    row.root.classList.add('done')
    row.root.classList.remove('current')
    row.marker.textContent = '✓'
    row.status.classList.add('hidden')
    row.actions.classList.add('hidden')
  }

  private moveCursor(rect: DOMRect, glide: boolean): void {
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    this.cursor.classList.toggle('flip', x + 170 > window.innerWidth)

    if (glide) {
      if (this.cursor.classList.contains('hidden')) {
        this.cursor.classList.remove('glide')
        this.cursor.style.left = `${window.innerWidth / 2}px`
        this.cursor.style.top = `${window.innerHeight - 60}px`
        this.cursor.classList.remove('hidden')
        void this.cursor.offsetWidth // flush so the glide animates from here
      }
      this.cursor.classList.add('glide')
    } else {
      this.cursor.classList.remove('glide')
      this.cursor.classList.remove('hidden')
    }
    this.cursor.style.left = `${x}px`
    this.cursor.style.top = `${y}px`
  }

  // ---- panel dragging (position persists across pages) ----

  private makeDraggable(handle: HTMLElement): void {
    handle.addEventListener('pointerdown', (down) => {
      if ((down.target as Element).closest('.close')) return
      down.preventDefault()
      const panelRect = this.panel.getBoundingClientRect()
      const offsetX = down.clientX - panelRect.left
      const offsetY = down.clientY - panelRect.top

      const onMove = (move: PointerEvent) => {
        this.placePanel(move.clientX - offsetX, move.clientY - offsetY)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        const rect = this.panel.getBoundingClientRect()
        void chrome.storage.local.set({ [PANEL_POS_KEY]: { left: rect.left, top: rect.top } })
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    })
  }

  private placePanel(left: number, top: number): void {
    const rect = this.panel.getBoundingClientRect()
    const clampedLeft = Math.min(Math.max(0, left), window.innerWidth - Math.min(rect.width, 120))
    const clampedTop = Math.min(Math.max(0, top), window.innerHeight - 48)
    this.panel.style.left = `${clampedLeft}px`
    this.panel.style.top = `${clampedTop}px`
  }

  private async restorePanelPosition(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(PANEL_POS_KEY)
      const pos = result[PANEL_POS_KEY] as { left: number; top: number } | undefined
      if (pos) this.placePanel(pos.left, pos.top)
    } catch {
      // storage unavailable — keep the default dock position
    }
  }
}
