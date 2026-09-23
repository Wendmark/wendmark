/**
 * Origins an app's snippet may be used from.
 *
 * An origin is a scheme, a host and an optional port — never a path. They are
 * normalised so that "https://App.Example.com/" and "https://app.example.com"
 * cannot both end up in the list and behave differently.
 */

/** At most this many origins per app: production, staging, a laptop or two. */
export const MAX_ORIGINS = 10

export type OriginResult = { ok: true; origin: string } | { ok: false; reason: string }

/** Whether a host is the developer's own machine. */
function isLocal(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

/** Checks and normalises one origin. */
export function parseOrigin(raw: string): OriginResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: false, reason: 'Enter an address.' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: `${trimmed} is not a valid address. Include https://.` }
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'Use http:// or https://.' }
  }
  if (url.protocol === 'http:' && !isLocal(url.hostname)) {
    return { ok: false, reason: 'Use https:// for anything but localhost.' }
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return { ok: false, reason: 'Give the site address only, without a path.' }
  }
  if (url.hostname.includes('*')) {
    return { ok: false, reason: 'Wildcards are not supported yet. Add each address.' }
  }

  return { ok: true, origin: url.origin }
}

/** Checks a whole list, keeping the order and dropping duplicates. */
export function parseOrigins(
  raws: string[],
): { ok: true; origins: string[] } | { ok: false; reason: string } {
  const origins: string[] = []

  for (const raw of raws) {
    if (raw.trim() === '') continue
    const result = parseOrigin(raw)
    if (!result.ok) return result
    if (!origins.includes(result.origin)) origins.push(result.origin)
  }

  if (origins.length === 0) return { ok: false, reason: 'Add at least one address.' }
  if (origins.length > MAX_ORIGINS) {
    return { ok: false, reason: `That is more than ${MAX_ORIGINS} addresses.` }
  }
  return { ok: true, origins }
}

/** Whether a request from this origin may use the app's key. */
export function isAllowedOrigin(origins: string[], candidate: string): boolean {
  const parsed = parseOrigin(candidate)
  return parsed.ok && origins.includes(parsed.origin)
}
