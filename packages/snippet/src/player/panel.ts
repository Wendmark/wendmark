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
    box-shadow: 0 14px 40px rgba(8, 51, 47, 0.2);
    color: #2a2833;
    font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    /* The one part of the overlay the user may click. */
    pointer-events: auto;
  }
  [data-wendmark="progress"] {
    font-size: 11px;
    font-weight: 600;
    color: #0e5c57;
  }
  [data-wendmark="steps"] {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    gap: 2px;
    /* Long processes scroll rather than covering the page they explain. */
    max-height: 40vh;
    overflow-y: auto;
  }
  [data-wendmark="steps"] li {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 8px;
    align-items: start;
    padding: 4px 0;
    color: #7a7488;
  }
  [data-wendmark="steps"] .marker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.16);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
  }
  [data-wendmark="steps"] li.is-done .marker {
    background: #0e5c57;
    border-color: #0e5c57;
    color: #ffffff;
  }
  [data-wendmark="steps"] li.is-current {
    color: #2a2833;
    font-weight: 600;
  }
  [data-wendmark="steps"] li.is-current .marker {
    border-color: #0e5c57;
    color: #0e5c57;
    box-shadow: 0 0 0 3px rgba(18, 133, 125, 0.18);
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
    background: #0e5c57;
    color: #ffffff;
    font-weight: 600;
  }
  [data-wendmark="panel"] button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #2a2833;
  }
`

/** What the panel shows about the process being followed. */
export interface PanelState {
  stepNumber: number
  total: number
  /** Every step's wording, in order, so the user can see what is coming. */
  steps: string[]
  /** Label for the step's own button, e.g. "Got it". Omitted when the user acts on the page. */
  primary?: string
}

/** What the panel's buttons do. */
export interface PanelOptions {
  onSkip: () => void
  onStop: () => void
  onPrimary: () => void
}

/** The card showing the whole process, with Skip and Stop. */
export interface Panel {
  show: (state: PanelState) => void
  setStatus: (text: string) => void
  hide: () => void
  destroy: () => void
}

/**
 * Creates the step panel inside an overlay's shadow root.
 *
 * It lists the whole process rather than only the step in hand: somebody
 * being guided through something unfamiliar wants to know how much is left
 * and what is about to be asked of them, and a single line tells them
 * neither.
 */
export function createPanel(root: ShadowRoot, doc: Document, options: PanelOptions): Panel {
  const style = doc.createElement('style')
  style.textContent = PANEL_CSS
  root.appendChild(style)

  const panel = doc.createElement('div')
  panel.dataset.wendmark = 'panel'
  panel.style.display = 'none'

  const progress = doc.createElement('div')
  progress.dataset.wendmark = 'progress'

  const steps = doc.createElement('ol')
  steps.dataset.wendmark = 'steps'

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
  panel.append(progress, steps, status, actions)
  root.appendChild(panel)

  /** Draws the list, with everything before the current step marked done. */
  function render(state: PanelState): void {
    steps.replaceChildren()

    state.steps.forEach((text, index) => {
      const number = index + 1
      const done = number < state.stepNumber
      const current = number === state.stepNumber

      const item = doc.createElement('li')
      item.className = done ? 'is-done' : current ? 'is-current' : ''
      if (current) item.setAttribute('aria-current', 'step')

      const marker = doc.createElement('span')
      marker.className = 'marker'
      marker.textContent = done ? '✓' : String(number)
      marker.setAttribute('aria-hidden', 'true')

      const label = doc.createElement('span')
      // textContent, never innerHTML: step text is data, not markup.
      label.textContent = text

      item.append(marker, label)
      steps.appendChild(item)
    })

    // The step in hand stays in view when a long process has scrolled.
    const currentItem = steps.children[state.stepNumber - 1]
    if (currentItem instanceof HTMLElement) {
      steps.scrollTop = Math.max(currentItem.offsetTop - steps.clientHeight / 2, 0)
    }
  }

  return {
    show: (state: PanelState) => {
      progress.textContent = `${state.stepNumber} / ${state.total}`
      render(state)
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
