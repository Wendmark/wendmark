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

/** The element with the given id. Throws if it is missing, so tests fail clearly. */
export function byId(id: string): Element {
  const element = document.getElementById(id)
  if (!element) throw new Error(`No element with id="${id}"`)
  return element
}

/**
 * Render HTML into the fake page and return the element marked with
 * `data-pick`. Used where an `id` would itself change what is being tested.
 */
export function renderPick(markup: string): Element {
  document.body.innerHTML = markup
  const element = document.querySelector('[data-pick]')
  if (!element) throw new Error('Markup has no element with data-pick')
  return element
}
