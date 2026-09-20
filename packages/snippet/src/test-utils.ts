/** Test helpers for the snippet's DOM tests. Not part of the bundle. */

/**
 * Give an element a fixed position and size. jsdom has no layout engine, so
 * every rect is 0x0 unless a test says otherwise.
 */
export function setRect(
  element: Element,
  rect: { left: number; top: number; width: number; height: number },
): void {
  const { left, top, width, height } = rect
  element.getBoundingClientRect = () =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
}

/** Render HTML and return the element marked with `data-pick`. */
export function renderPick(markup: string): Element {
  document.body.innerHTML = markup
  const element = document.querySelector('[data-pick]')
  if (!element) throw new Error('Markup has no element with data-pick')
  return element
}
