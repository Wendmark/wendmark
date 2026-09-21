/**
 * Comparing pages, loosely.
 *
 * A step recorded on /orders/10421 should still be recognised on
 * /orders/98765: same screen, different data. So path segments that look
 * like identifiers are treated as wildcards, and anything we cannot parse
 * is treated as "no information" rather than a mismatch: a URL is a hint for
 * a helpful message, never a reason to refuse guidance.
 */

/** Segments that are probably an id rather than a name. */
function looksLikeId(segment: string): boolean {
  return /\d/.test(segment) || segment.length > 24
}

/** The site and the path segments of an address, hash routes included. */
function parts(raw: string): { origin: string; segments: string[] } | null {
  try {
    const url = new URL(raw)
    const hashRoute = url.hash.startsWith('#/') ? url.hash.slice(1) : ''
    return {
      origin: url.origin,
      segments: (url.pathname + hashRoute).split('/').filter(Boolean),
    }
  } catch {
    return null
  }
}

/** Whether a step recorded on one page belongs to the page we are on now. */
export function urlMatches(recorded: string, current: string): boolean {
  const was = parts(recorded)
  const now = parts(current)
  if (!was || !now) return true

  if (was.origin !== now.origin) return false
  // Recorded at the site root: the app probably does not route by URL, so
  // the address tells us nothing and any page on the site will do.
  if (was.segments.length === 0) return true
  if (was.segments.length !== now.segments.length) return false

  return was.segments.every((segment, index) => {
    const other = now.segments[index] ?? ''
    return segment === other || looksLikeId(segment) || looksLikeId(other)
  })
}

/** The part of an address a person would recognise, e.g. "/orders". */
export function prettyPath(url: string): string {
  const parsed = parts(url)
  if (!parsed) return url
  return `/${parsed.segments.join('/')}`
}
