/**
 * The authoring bundle: everything only a person recording a process needs.
 *
 * Built as its own file and fetched on demand, so it costs ordinary visitors
 * nothing. The recorder panel lands here next.
 */
import type { AuthorContext } from './loader'
import { createOverlay } from '../overlay/overlay'

const BADGE_CSS = `
  [data-wendmark="author-badge"] {
    position: fixed;
    left: 16px;
    bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: #1c1b22;
    color: #f5f4fa;
    font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
  }
  [data-wendmark="author-badge"] button {
    font: inherit;
    font-size: 11px;
    padding: 3px 9px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
`

/** Starts authoring in this page. Called by the snippet once it has a session. */
export function start(context: AuthorContext): void {
  const { doc } = context
  const overlay = createOverlay(doc)

  const style = doc.createElement('style')
  style.textContent = BADGE_CSS
  overlay.root.appendChild(style)

  const badge = doc.createElement('div')
  badge.dataset.wendmark = 'author-badge'

  const label = doc.createElement('span')
  label.textContent = 'Author mode'

  const exit = doc.createElement('button')
  exit.type = 'button'
  exit.textContent = 'Exit'
  exit.addEventListener('click', () => overlay.destroy())

  badge.append(label, exit)
  overlay.root.appendChild(badge)
}
