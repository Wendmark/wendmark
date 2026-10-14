/**
 * Comparing pages, loosely.
 *
 * Two things make this deliberately forgiving:
 *
 * - **Environments.** A flow recorded on http://localhost:5174/profile has to
 *   work on https://app.example.com/profile. So the origin is ignored: which
 *   app a flow belongs to is decided by the portal, not by the address bar.
 * - **Data.** A step recorded on /orders/10421 should be recognised on
 *   /orders/98765 — same screen, different order. Path segments that look
 *   like identifiers are treated as wildcards.
 *
 * Anything unparseable counts as "no information" rather than a mismatch: a
 * page is a hint for a helpful message, never a reason to refuse guidance.
 */

/** Stands in for the origin so relative paths can be parsed the same way. */
const PLACEHOLDER_ORIGIN = 'https://wendmark.invalid'

/** Segments that are probably an id rather than a name. */
function looksLikeId(segment: string): boolean {
  return /\d/.test(segment) || segment.length > 24
}

/** The path segments of an address, hash routes included, origin ignored. */
function segmentsOf(raw: string): string[] | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  try {
    const url = new URL(trimmed, PLACEHOLDER_ORIGIN)
    const hashRoute = url.hash.startsWith('#/') ? url.hash.slice(1) : ''
    return (url.pathname + hashRoute).split('/').filter(Boolean)
  } catch {
    return null
  }
}

/**
 * The page part of an address: what we store on a step, and what we compare.
 * No origin (environments differ) and no query string (it carries data, and
 * sometimes personal data).
 */
export function pagePath(url: string): string {
  const segments = segmentsOf(url)
  if (!segments) return '/'
  return `/${segments.join('/')}`
}

/** Whether a step recorded on one page belongs to the page we are on now. */
export function urlMatches(recorded: string, current: string): boolean {
  const was = segmentsOf(recorded)
  const now = segmentsOf(current)
  if (!was || !now) return true

  // Recorded at the site root: the app probably does not route by URL, so
  // the address tells us nothing and any page will do.
  if (was.length === 0) return true
  if (was.length !== now.length) return false

  return was.every((segment, index) => {
    const other = now[index] ?? ''
    // `*` is an identifier masked out of a problem report: any one will do.
    return segment === other || segment === '*' || looksLikeId(segment) || looksLikeId(other)
  })
}

/** The part of an address a person would recognise, e.g. "/orders". */
export function prettyPath(url: string): string {
  return pagePath(url)
}
