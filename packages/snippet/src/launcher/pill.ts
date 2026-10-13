/**
 * The launcher's pill: mark, label, chevron.
 *
 * The closed button and the open panel's bar are built from this one piece,
 * so opening reads as the button growing rather than a panel replacing it.
 * Both must stay pixel-identical: the panel's opening animation starts
 * clipped to exactly the pill's size.
 */

/* The Wendmark mark without its tile: the pill is the tile. Fixed markup,
   so innerHTML is safe here; the app's label never goes through it. */
const MARK_SVG = `
<svg class="mark" viewBox="9 3 51 58" width="18" height="20" aria-hidden="true" focusable="false">
  <path d="M12 6 L12 38 L20 31 L25.5 43 L31 40.5 L25.5 28.8 L36 28.8 Z"
    fill="#ffffff" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M29.5 47 C32 56 41 58 45 50 C48.5 43 54 43 56 49"
    fill="none" stroke="#5fb8ae" stroke-width="4.5" stroke-linecap="round"/>
</svg>`

/* Points up because the launcher opens upward from the corner. */
const CHEVRON_SVG = `
<svg class="chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
  <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.25"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

/** The pill's height, which the panel's opening animation clips down to. */
export const PILL_HEIGHT = 40

/** Size, colour and type shared by the button and the bar. */
export const PILL_CSS = `
  .pill {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: ${PILL_HEIGHT}px;
    max-width: 100%;
    padding: 0 14px 0 12px;
    font: 600 14px/1 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    color: #fff;
  }
  /* A label the app chose could be anything: keep it on one line rather
     than letting it wrap into a pill sized for one. Only the label gives
     way, so the icons are never clipped. */
  .label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mark, .chevron { flex: none; display: block; }
  .chevron { opacity: 0.85; }
  /* The recorder's pill: a light that says clicks are being captured. */
  .rec-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff4d4f;
    animation: wendmark-rec 1.4s ease-in-out infinite;
  }
  .rec-dot.is-paused { background: #b0a9c0; animation: none; }
  @keyframes wendmark-rec {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @media (prefers-reduced-motion: reduce) {
    .rec-dot { animation: none; }
  }
`

/**
 * Fills an element with the mark, the label and the chevron, plus a
 * recording light when asked. Returns the label, for whoever needs to
 * change it later.
 */
export function fillPill(
  element: HTMLElement,
  label: string,
  options: { recording?: boolean } = {},
): HTMLElement {
  const dot = options.recording ? '<span class="rec-dot"></span>' : ''
  element.innerHTML = `${MARK_SVG}${dot}<span class="label"></span>${CHEVRON_SVG}`
  // textContent, never innerHTML: the label is the app's data, not markup.
  const text = element.querySelector<HTMLElement>('.label')
  if (!text) throw new Error('pill markup has no label')
  text.textContent = label
  return text
}
