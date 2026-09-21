const BADGE_CSS = `
  [data-wendmark="recording-badge"] {
    position: fixed;
    left: 16px;
    bottom: 16px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 999px;
    background: #1c1b22;
    color: #f5f4fa;
    font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }
  [data-wendmark="recording-badge"] i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e5484d;
    animation: wendmark-pulse 1.4s ease-in-out infinite;
  }
  @keyframes wendmark-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-wendmark="recording-badge"] i { animation: none; }
  }
`

/** The badge shown while recording, so it is never a secret. */
export interface RecordingBadge {
  destroy: () => void
}

/** Shows a "Recording" badge inside an overlay's shadow root. */
export function createRecordingBadge(root: ShadowRoot, doc: Document): RecordingBadge {
  const style = doc.createElement('style')
  style.textContent = BADGE_CSS
  root.appendChild(style)

  const badge = doc.createElement('div')
  badge.dataset.wendmark = 'recording-badge'

  const dot = doc.createElement('i')
  const label = doc.createElement('span')
  label.textContent = 'Recording'
  badge.append(dot, label)
  root.appendChild(badge)

  return {
    destroy: () => {
      badge.remove()
      style.remove()
    },
  }
}
