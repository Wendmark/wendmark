const PANEL_CSS = `
  [data-wendmark="panel"] {
    position: fixed;
    left: 16px;
    bottom: 16px;
    width: 300px;
    max-width: calc(100vw - 32px);
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 14px 40px rgba(30, 25, 70, 0.22);
    color: #2a2833;
    font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    /* The one part of the overlay the user may click. */
    pointer-events: auto;
  }
  [data-wendmark="progress"] {
    font-size: 11px;
    font-weight: 600;
    color: #5a48e8;
  }
  [data-wendmark="step-text"] {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
  }
  [data-wendmark="status"] {
    margin-top: 6px;
    font-size: 12px;
    color: #7a7488;
  }
  [data-wendmark="panel"] .actions {
    display: flex;
    gap: 6px;
    margin-top: 10px;
  }
  [data-wendmark="panel"] button {
    font: inherit;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 7px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    background: transparent;
    color: #5f5a70;
    cursor: pointer;
  }
  [data-wendmark="panel"] button[data-wendmark="primary"] {
    border-color: transparent;
    background: #5a48e8;
    color: #ffffff;
    font-weight: 600;
  }
  [data-wendmark="panel"] button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #2a2833;
  }
`

/** What the panel shows about the current step. */
export interface PanelState {
  stepNumber: number
  total: number
  text: string
  /** Label for the step's own button, e.g. "Got it". Omitted when the user acts on the page. */
  primary?: string
}

/** What the panel's buttons do. */
export interface PanelOptions {
  onSkip: () => void
  onStop: () => void
  onPrimary: () => void
}

/** The small card showing the current step, with Skip and Stop. */
export interface Panel {
  show: (state: PanelState) => void
  setStatus: (text: string) => void
  hide: () => void
  destroy: () => void
}

/** Creates the step panel inside an overlay's shadow root. */
export function createPanel(root: ShadowRoot, doc: Document, options: PanelOptions): Panel {
  const style = doc.createElement('style')
  style.textContent = PANEL_CSS
  root.appendChild(style)

  const panel = doc.createElement('div')
  panel.dataset.wendmark = 'panel'
  panel.style.display = 'none'

  const progress = doc.createElement('div')
  progress.dataset.wendmark = 'progress'

  const stepText = doc.createElement('div')
  stepText.dataset.wendmark = 'step-text'

  const status = doc.createElement('div')
  status.dataset.wendmark = 'status'

  const actions = doc.createElement('div')
  actions.className = 'actions'

  const primary = doc.createElement('button')
  primary.dataset.wendmark = 'primary'
  primary.type = 'button'
  primary.style.display = 'none'
  primary.addEventListener('click', () => options.onPrimary())

  const skip = doc.createElement('button')
  skip.dataset.wendmark = 'skip'
  skip.type = 'button'
  skip.textContent = 'Skip'
  skip.addEventListener('click', () => options.onSkip())

  const stop = doc.createElement('button')
  stop.dataset.wendmark = 'stop'
  stop.type = 'button'
  stop.textContent = 'Stop'
  stop.addEventListener('click', () => options.onStop())

  actions.append(primary, skip, stop)
  panel.append(progress, stepText, status, actions)
  root.appendChild(panel)

  return {
    show: (state: PanelState) => {
      progress.textContent = `${state.stepNumber} / ${state.total}`
      // textContent, never innerHTML: step text is data, not markup.
      stepText.textContent = state.text
      status.textContent = ''
      if (state.primary) {
        primary.textContent = state.primary
        primary.style.display = 'inline-block'
      } else {
        primary.style.display = 'none'
      }
      panel.style.display = 'block'
    },
    setStatus: (text: string) => {
      status.textContent = text
    },
    hide: () => {
      panel.style.display = 'none'
    },
    destroy: () => {
      panel.remove()
      style.remove()
    },
  }
}
