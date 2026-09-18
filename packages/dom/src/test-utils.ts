/** Test helpers shared by this package's DOM tests. Not exported from the package. */

/** Render HTML into the fake page and return its first element. */
export function render(markup: string): Element {
  document.body.innerHTML = markup
  const element = document.body.firstElementChild
  if (!element) throw new Error('No element rendered')
  return element
}

/** Render HTML into the fake page and return the element with id="target". */
export function renderTarget(markup: string): Element {
  document.body.innerHTML = markup
  const element = document.getElementById('target')
  if (!element) throw new Error('Markup has no element with id="target"')
  return element
}
