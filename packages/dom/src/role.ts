/** Roles that mean "this element is only for layout". */
const NO_ROLE = new Set(['none', 'presentation'])

/** Tags whose implicit role never depends on their attributes. */
const TAG_ROLES: Record<string, string> = {
  button: 'button',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  nav: 'navigation',
  main: 'main',
  textarea: 'textbox',
  dialog: 'dialog',
  table: 'table',
  tr: 'row',
  td: 'cell',
}

/** Roles of <input> by its type. Types not listed here have no role. */
const INPUT_ROLES: Record<string, string> = {
  text: 'textbox',
  email: 'textbox',
  tel: 'textbox',
  url: 'textbox',
  search: 'searchbox',
  checkbox: 'checkbox',
  radio: 'radio',
  button: 'button',
  submit: 'button',
  reset: 'button',
  image: 'button',
  range: 'slider',
  number: 'spinbutton',
}

/** The role an element has from its tag alone, without a role attribute. */
function implicitRole(element: Element): string | null {
  const tag = element.localName

  if (tag === 'a') return element.hasAttribute('href') ? 'link' : null
  if (tag === 'img') return element.getAttribute('alt') === '' ? null : 'img'
  if (element instanceof HTMLSelectElement) {
    return element.multiple || element.size > 1 ? 'listbox' : 'combobox'
  }
  if (element instanceof HTMLInputElement) return INPUT_ROLES[element.type] ?? null

  return TAG_ROLES[tag] ?? null
}

/**
 * The ARIA role of an element: what kind of thing it is (button, link,
 * checkbox…). Returns null when the element has no meaningful role.
 */
export function getRole(element: Element): string | null {
  const explicit = element.getAttribute('role')?.trim().toLowerCase()
  if (explicit) {
    const first = explicit.split(/\s+/)[0]
    if (first && NO_ROLE.has(first)) return null
    return first ?? null
  }
  return implicitRole(element)
}
