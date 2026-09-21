/**
 * Crossing shadow boundaries.
 *
 * A shadow root is a sealed sub-document: `parentElement` stops at its edge,
 * and a selector cannot reach into it. Web components are built this way, so
 * without these helpers such apps are invisible to us.
 *
 * Only *open* shadow roots can be reached. A closed one is private to the
 * component, and nothing can be done about that.
 */

/** How many roots deep to look, so a pathological page cannot hang us. */
const MAX_DEPTH = 10

/** The element above this one, stepping out of a shadow root when needed. */
export function parentAcrossShadow(element: Element): Element | null {
  if (element.parentElement) return element.parentElement
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

/** The document or shadow root an element belongs to. */
export function rootOf(element: Element): Document | ShadowRoot {
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root : element.ownerDocument
}

/** Whether an element lives inside a shadow root rather than the page itself. */
export function isInShadow(element: Element): boolean {
  return element.getRootNode() instanceof ShadowRoot
}

/** Every element matching a selector, looking inside open shadow roots too. */
export function queryAllDeep(root: ParentNode, selector: string, depth = 0): Element[] {
  const found: Element[] = []
  try {
    found.push(...root.querySelectorAll(selector))
  } catch {
    return found
  }
  if (depth >= MAX_DEPTH) return found

  for (const element of root.querySelectorAll('*')) {
    const shadow = element.shadowRoot
    if (shadow) found.push(...queryAllDeep(shadow, selector, depth + 1))
  }
  return found
}

/**
 * The route to an element through shadow boundaries: a selector for each
 * host on the way in, and the element's own selector last.
 *
 * ["fika-app", "sl-button", "button.primary"] means: find <fika-app>, go
 * into its shadow root, find <sl-button>, go into its shadow root, find
 * the button.
 */
export function followShadowPath(path: string[], root: ParentNode): Element | null {
  let current: ParentNode = root

  for (const [index, selector] of path.entries()) {
    let next: Element | null
    try {
      next = current.querySelector(selector)
    } catch {
      return null
    }
    if (!next) return null

    const isLast = index === path.length - 1
    if (isLast) return next
    if (!next.shadowRoot) return null
    current = next.shadowRoot
  }
  return null
}
