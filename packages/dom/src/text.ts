/** Small helpers for turning page text into clean, bounded values. */

/** Collapse runs of whitespace into single spaces and trim the ends. */
export function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** Cut a value to a maximum length, so page content can never bloat a flow. */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd()
}

/** Form fields whose own content must never end up in a name. */
const FORM_CONTROLS = 'input, select, textarea'

/**
 * The text inside an element, without the content of any form field.
 *
 * A form field's own content is what the user typed, or the options they
 * could choose from, so it is never text we may keep.
 */
export function textWithoutFields(element: Element): string {
  if (element.matches(FORM_CONTROLS)) return ''
  const copy = element.cloneNode(true)
  if (!(copy instanceof Element)) return ''
  copy.querySelectorAll(FORM_CONTROLS).forEach((control) => control.remove())
  return clean(copy.textContent)
}
