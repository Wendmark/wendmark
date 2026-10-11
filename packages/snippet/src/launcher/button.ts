import { fillPill, PILL_CSS } from './pill'

/**
 * The button that opens the launcher.
 *
 * Only shown when an app turns it on in the portal. Wendmark appears inside
 * someone else's product, and adding something to their interface uninvited
 * is not our decision to make.
 */

const CSS = `
  ${PILL_CSS}
  .opener {
    position: fixed;
    right: 16px;
    bottom: 16px;
    pointer-events: auto;
    max-width: calc(100vw - 32px);
    background: #0e5c57;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(20, 18, 40, 0.22);
  }
  .opener:hover { background: #0a4642; }
  .opener .chevron { transition: transform 160ms ease; }
  .opener:hover .chevron { transform: translateY(-2px); }
  /* Something happens the moment it is pressed, rather than only once the
     panel has finished working out what to show. */
  .opener:active { transform: scale(0.97); }
  .opener { transition: background-color 160ms ease, transform 100ms ease; }

  @media (prefers-reduced-motion: reduce) {
    .opener { transition: background-color 1ms; }
    .opener:active { transform: none; }
    .opener:hover .chevron { transform: none; }
  }
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
  label: string,
  onOpen: () => void,
): OpenerButton {
  const style = doc.createElement('style')
  style.textContent = CSS
  root.appendChild(style)

  const button = doc.createElement('button')
  button.type = 'button'
  button.className = 'opener pill'
  fillPill(button, label)
  button.setAttribute('aria-haspopup', 'dialog')
  button.setAttribute('aria-expanded', 'false')
  button.addEventListener('click', onOpen)
  root.appendChild(button)

  return {
    destroy: () => {
      button.remove()
      style.remove()
    },
    setHidden: (hidden: boolean) => {
      button.style.display = hidden ? 'none' : ''
      button.setAttribute('aria-expanded', hidden ? 'true' : 'false')
    },
  }
}
