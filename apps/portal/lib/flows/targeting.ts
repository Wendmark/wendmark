/**
 * Which pages a process offers itself on.
 *
 * A flow with no patterns applies everywhere — that is the common case, and
 * the one an author gets without deciding anything. Patterns are paths, not
 * addresses: the same flow has to work on localhost, staging and production,
 * so the origin never takes part. Editing them is a separate screen.
 *
 * Deliberately not the loose matching in @wendmark/dom: that guesses whether
 * a recorded step belongs to the page in front of it. This is an author
 * saying exactly where a process belongs, and it should do what they wrote.
 */

/** The path part of an address, without origin, query or hash. */
export function pathOf(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  try {
    // A relative path needs a base to parse against; the base is discarded.
    const url = new URL(trimmed, 'https://wendmark.invalid')
    return url.pathname
  } catch {
    return null
  }
}

function segments(path: string): string[] {
  return path.split('/').filter(Boolean)
}

/**
 * Whether one pattern covers a path.
 *
 * `*` stands for one segment, `**` for the rest. `/orders` matches only
 * `/orders`; `/orders/*` matches `/orders/10421` but not `/orders`; and
 * `/orders/**` matches both the list and anything below it.
 */
export function patternMatches(pattern: string, path: string): boolean {
  const wanted = segments(pattern)
  const actual = segments(path)

  for (let index = 0; index < wanted.length; index += 1) {
    const part = wanted[index]
    if (part === '**') return true
    if (index >= actual.length) return false
    if (part !== '*' && part !== actual[index]) return false
  }

  return wanted.length === actual.length
}

/**
 * Whether a flow applies to the page the snippet is on.
 *
 * No patterns means everywhere. An address we cannot read means we do not
 * know, and a flow that might apply is better than one silently missing —
 * the launcher shows it, and the player says so if the page is wrong.
 */
export function appliesTo(patterns: readonly string[], url: string | null): boolean {
  if (patterns.length === 0) return true
  if (url === null) return true

  const path = pathOf(url)
  if (path === null) return true

  return patterns.some((pattern) => patternMatches(pattern, path))
}
