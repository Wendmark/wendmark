/**
 * Capture-phase click recorder. Observes only — never intercepts or blocks
 * the user's clicks. Clicks are appended straight to chrome.storage.local so
 * a recording survives page navigations.
 */
import { appendClick, type RawClick } from '../recording'
import {
  buildSelector,
  getVisibleText,
  getRole,
  getAccessibleName,
  stableClasses,
  describeAncestors,
  findContext,
} from './selector'
import { OVERLAY_TAG } from './overlay'

const BADGE_TAG = 'wend-record-badge'

/** Clicks often land on a <span> inside a <button>; climb to the control. */
const INTERACTIVE =
  'button, a, input, select, textarea, summary, label, [role="button"], [role="link"], ' +
  '[role="menuitem"], [role="menuitemradio"], [role="tab"], [role="option"], [role="row"], ' +
  '[role="gridcell"], [role="listitem"], [role="treeitem"], [role="checkbox"], ' +
  '[role="radio"], [role="switch"], [role="combobox"], [onclick], ' +
  '[tabindex]:not([tabindex="-1"]), li, tr'

function pickTarget(path: EventTarget[]): Element | null {
  const elements = path.filter((n): n is Element => n instanceof Element)
  for (const el of elements.slice(0, 5)) {
    if (el.matches(INTERACTIVE)) return el
  }
  return elements[0] ?? null
}

export class Recorder {
  private active = false
  /** Serializes storage read-modify-writes so rapid clicks don't race. */
  private queue: Promise<void> = Promise.resolve()
  private badge: HTMLElement | null = null

  get isActive(): boolean {
    return this.active
  }

  start(): void {
    if (this.active) return
    this.active = true
    document.addEventListener('click', this.onClick, true)
    this.showBadge()
  }

  stop(): void {
    if (!this.active) return
    this.active = false
    document.removeEventListener('click', this.onClick, true)
    this.badge?.remove()
    this.badge = null
  }

  private onClick = (event: MouseEvent): void => {
    const path = event.composedPath()
    // Ignore clicks on Wend's own UI.
    if (
      path.some(
        (n) =>
          n instanceof Element &&
          (n.tagName.toLowerCase() === OVERLAY_TAG || n.tagName.toLowerCase() === BADGE_TAG),
      )
    ) {
      return
    }
    const target = pickTarget(path)
    if (!target) return

    const click: RawClick = {
      selector: buildSelector(target),
      text: getVisibleText(target),
      role: getRole(target),
      name: getAccessibleName(target),
      classes: stableClasses(target),
      ancestors: describeAncestors(target),
      context: findContext(target),
      url: location.href,
      at: Date.now(),
    }
    this.queue = this.queue.then(() => appendClick(click)).catch(() => {})
  }

  private showBadge(): void {
    this.badge = document.createElement(BADGE_TAG)
    this.badge.style.cssText =
      'all: initial; position: fixed; left: 16px; bottom: 16px; z-index: 2147483647; pointer-events: none;'
    const root = this.badge.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        .pill {
          display: flex; align-items: center; gap: 7px;
          background: #1c1b22; color: #f5f4fa;
          font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          border-radius: 999px; padding: 8px 14px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        }
        .dot {
          width: 8px; height: 8px; border-radius: 50%; background: #e5484d;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      </style>
      <div class="pill"><span class="dot"></span>Recording</div>`
    document.documentElement.appendChild(this.badge)
  }
}
