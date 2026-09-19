import { getRole } from './role'

/** Collapse runs of whitespace into single spaces and trim the ends. */
function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** Form fields whose own content must never end up in a name. */
const FORM_CONTROLS = 'input, select, textarea'

/** Input types whose value is a caption written by the page author. */
const CAPTION_INPUT_TYPES = new Set(['button', 'submit', 'reset'])

/** Roles whose name comes from the text inside the element. */
const NAME_FROM_CONTENT = new Set([
  'button',
  'link',
  'heading',
  'listitem',
  'cell',
  'tab',
  'option',
  'menuitem',
  'checkbox',
  'radio',
  'switch',
])

/** The text inside an element, without the content of any form field inside it. */
function textWithoutFields(element: Element): string {
  const copy = element.cloneNode(true)
  if (!(copy instanceof Element)) return ''
  copy.querySelectorAll(FORM_CONTROLS).forEach((control) => control.remove())
  return clean(copy.textContent)
}

/**
 * The accessible name of an element: what it is called (what a screen reader
 * announces). Returns null when the element has no name.
 *
 * Never reads what the user typed: form fields are named by their labels,
 * not their values.
 */
export function getAccessibleName(element: Element): string | null {
  // 1. aria-labelledby: the text of other elements, by id, in the listed order.
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = clean(
      labelledBy
        .split(/\s+/)
        .map((id) => element.ownerDocument.getElementById(id)?.textContent)
        .join(' '),
    )
    if (text) return text
  }

  // 2. aria-label: a name written directly on the element.
  const label = clean(element.getAttribute('aria-label'))
  if (label) return label

  // 3. Native labels.
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const fromLabels = clean(Array.from(element.labels ?? [], textWithoutFields).join(' '))
    if (fromLabels) return fromLabels
  }
  if (element instanceof HTMLInputElement && CAPTION_INPUT_TYPES.has(element.type)) {
    const caption = clean(element.getAttribute('value'))
    if (caption) return caption
  }
  if (element instanceof HTMLImageElement) {
    const alt = clean(element.getAttribute('alt'))
    if (alt) return alt
  }

  // 4. The element's own text, for roles that are named by their content.
  const role = getRole(element)
  if (role && NAME_FROM_CONTENT.has(role)) {
    const text = textWithoutFields(element)
    if (text) return text
  }

  // 5. Last resorts: title, then placeholder.
  const title = clean(element.getAttribute('title'))
  if (title) return title
  const placeholder = clean(element.getAttribute('placeholder'))
  if (placeholder) return placeholder

  return null
}
