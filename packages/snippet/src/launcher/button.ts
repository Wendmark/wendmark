/**
 * The button that opens the launcher.
 *
 * Only shown when an app turns it on in the portal. Wendmark appears inside
 * someone else's product, and adding something to their interface uninvited
 * is not our decision to make.
 */

const CSS = `
  .opener {
    position: fixed;
    right: 16px;
    bottom: 16px;
    pointer-events: auto;
    font: 600 14px/1 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #fff;
    background: #5a48e8;
    border: none;
    border-radius: 999px;
    padding: 11px 16px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(20, 18, 40, 0.22);
  }
  .opener:hover { background: #4a3ad0; }
  .opener:focus-visible { outline: 2px solid #1f1d2b; outline-offset: 2px; }
`

export interface OpenerButton {
  destroy: () => void
  /** Hidden while the launcher itself is open, so they cannot overlap. */
  setHidden: (hidden: boolean) => void
}

export function createOpenerButton(
  root: ShadowRoot,
  doc: Document,
  onOpen: () => void,
): OpenerButton {
  const style = doc.createElement('style')
  style.textContent = CSS
  root.appendChild(style)

  const button = doc.createElement('button')
  button.type = 'button'
  button.className = 'opener'
  button.textContent = 'How do I…'
  button.setAttribute('aria-haspopup', 'dialog')
  button.addEventListener('click', onOpen)
  root.appendChild(button)

  return {
    destroy: () => {
      button.remove()
      style.remove()
    },
    setHidden: (hidden: boolean) => {
      button.style.display = hidden ? 'none' : ''
    },
  }
}
