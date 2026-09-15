import { querySelectorAllDeep } from 'query-selector-shadow-dom'

/**
 * Derive a selector, visible text, ARIA role, and accessible name for a
 * clicked element. Selectors prefer a stable id or data attribute; otherwise
 * a short structural path is built. Paths use descendant combinators so
 * query-selector-shadow-dom can match them across shadow boundaries.
 *
 * Privacy rule: input values are never read — only structure and authored
 * labels, never user-entered data.
 */

const STABLE_DATA_ATTRS = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-qa',
  'data-cy',
  'data-id',
  'data-name',
  'data-action',
]

const MAX_PATH_SEGMENTS = 10

/** Reject ids that look auto-generated (framework counters, uuids, hashes). */
function isStableId(id: string): boolean {
  if (!id || id.length > 64) return false
  if (/\d{4,}/.test(id)) return false
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id)) return false
  if (/^(ember|react|radix|mui|headlessui|:)/i.test(id)) return false
  // UI5/Fiori-style generated ids: "__button42", "__xmlview3--btn"
  if (/^__/.test(id)) return false
  return true
}

function segmentFor(el: Element): { seg: string; stable: boolean } {
  if (el.id && isStableId(el.id)) {
    return { seg: `#${CSS.escape(el.id)}`, stable: true }
  }
  for (const attr of STABLE_DATA_ATTRS) {
    const value = el.getAttribute(attr)
    if (value) {
      return { seg: `[${attr}="${CSS.escape(value)}"]`, stable: true }
    }
  }
  let seg = el.tagName.toLowerCase()
  const parent = el.parentElement
  if (parent) {
    const sameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName)
    if (sameTag.length > 1) seg += `:nth-of-type(${sameTag.indexOf(el) + 1})`
  }
  return { seg, stable: false }
}

/** Next element up the tree, crossing shadow boundaries via the host. */
function parentAcrossShadow(el: Element): Element | null {
  if (el.parentElement) return el.parentElement
  const root = el.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

/** Does this selector match exactly the given element, and nothing else? */
function uniquelyMatches(selector: string, el: Element): boolean {
  try {
    const matches = querySelectorAllDeep(selector)
    return matches.length === 1 && matches[0] === el
  } catch {
    return false
  }
}

export function buildSelector(el: Element): string {
  let selector = segmentFor(el).seg

  // Chain upward with child combinators (precise) within a tree, and a
  // descendant combinator only when hopping across a shadow boundary.
  // Stop as soon as the selector uniquely identifies the element — shorter
  // selectors survive markup changes better than deep fixed-length paths.
  let current: Element = el
  for (let depth = 1; depth < MAX_PATH_SEGMENTS; depth++) {
    if (uniquelyMatches(selector, el)) return selector
    const parent = current.parentElement
    const viaShadow = parent === null
    const next = parentAcrossShadow(current)
    if (!next || next === document.documentElement || next === document.body) break
    const { seg } = segmentFor(next)
    selector = seg + (viaShadow ? ' ' : ' > ') + selector
    current = next
  }
  return selector
}

/** Class names that look hand-written, not generated (no digits/hashes). */
export function stableClasses(el: Element): string[] {
  return Array.from(el.classList)
    .filter((c) => c.length > 2 && c.length <= 40 && !/\d/.test(c) && !c.includes('--'))
    .slice(0, 6)
}

/**
 * Compact description of each ancestor, innermost first — gives the
 * generator a picture of where the element lives in the page structure.
 */
export function describeAncestors(el: Element, max = 5): string[] {
  const out: string[] = []
  let current = parentAcrossShadow(el)
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement &&
    out.length < max
  ) {
    let desc = current.tagName.toLowerCase()
    if (current.id && isStableId(current.id)) desc += `#${current.id}`
    const cls = stableClasses(current).slice(0, 2)
    if (cls.length) desc += `.${cls.join('.')}`
    const role = current.getAttribute('role')
    if (role) desc += `[role=${role}]`
    const label = current.getAttribute('aria-label')?.trim()
    if (label) desc += `[label="${label.slice(0, 40)}"]`
    out.push(desc)
    current = parentAcrossShadow(current)
  }
  return out
}

/**
 * Nearest section context: the aria-label or first heading of the closest
 * labeled ancestor. Used to disambiguate ("the Save button in the Order
 * Details panel") and to write better instructions.
 */
export function findContext(el: Element): string {
  let current = parentAcrossShadow(el)
  for (let i = 0; current && i < 12; i++) {
    const label = current.getAttribute('aria-label')?.trim()
    if (label) return label.slice(0, 80)
    const heading = current.querySelector('h1, h2, h3, h4, [role="heading"]')
    const headingText = heading?.textContent?.replace(/\s+/g, ' ').trim()
    if (headingText) return headingText.slice(0, 80)
    current = parentAcrossShadow(current)
  }
  return ''
}

export function getVisibleText(el: Element): string {
  // Structure only: form controls' text lives in labels, never in .value.
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return ''
  }
  const text = (el as HTMLElement).innerText ?? el.textContent ?? ''
  return text.replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function getRole(el: Element): string {
  const explicit = el.getAttribute('role')
  if (explicit) return explicit
  const tag = el.tagName.toLowerCase()
  switch (tag) {
    case 'button':
    case 'summary':
      return 'button'
    case 'a':
      return el.hasAttribute('href') ? 'link' : ''
    case 'select':
      return 'combobox'
    case 'textarea':
      return 'textbox'
    case 'option':
      return 'option'
    case 'input': {
      const type = (el as HTMLInputElement).type
      if (type === 'checkbox' || type === 'radio') return type
      if (type === 'button' || type === 'submit' || type === 'reset') return 'button'
      if (type === 'range') return 'slider'
      if (type === 'search') return 'searchbox'
      return 'textbox'
    }
    default:
      return ''
  }
}

export function getAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label')?.trim()
  if (ariaLabel) return ariaLabel

  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => (el.getRootNode() as Document | ShadowRoot).getElementById?.(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) return text
  }

  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    // Authored button captions are labels, not user data.
    if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type)) {
      if (el.value) return el.value
    }
    const label =
      el.labels?.[0]?.textContent?.trim() ??
      el.closest('label')?.textContent?.trim() ??
      el.getAttribute('placeholder')?.trim()
    if (label) return label.replace(/\s+/g, ' ').slice(0, 80)
    return el.getAttribute('title')?.trim() ?? ''
  }

  const visible = getVisibleText(el)
  if (visible) return visible
  return (
    el.getAttribute('title')?.trim() ??
    (el as HTMLImageElement).alt?.trim?.() ??
    ''
  )
}
