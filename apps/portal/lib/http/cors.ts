/**
 * Answering a browser's preflight.
 *
 * The snippet calls these endpoints with the host page's `fetch`, and plenty
 * of apps have wrapped theirs — telemetry, tracing, an API client — so our
 * requests arrive carrying headers we never asked for. Refusing them means
 * Wendmark works on a plain page and fails on a real one, which is the wrong
 * way round.
 *
 * Echoing what was asked for is safe here because no endpoint trusts a
 * header. Who is calling is decided by the Origin against an app's
 * allowlist, and by a token in the body; `Access-Control-Allow-Headers` only
 * decides what the browser may send us, not what we believe.
 */

/** Headers we need regardless of what the page asks for. */
const ALWAYS = 'content-type'

/** Longer than any header list an interceptor would sensibly add. */
const MAX_LENGTH = 1024

/** A header name, as the spec allows one to be written. */
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/

/**
 * What to put in `Access-Control-Allow-Headers`.
 *
 * Takes the browser's own list, keeps the entries that look like header
 * names, and always includes the one we rely on.
 */
export function allowedHeaders(requested: string | null): string {
  if (!requested || requested.length > MAX_LENGTH) return ALWAYS

  const names = requested
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '' && HEADER_NAME.test(name))

  if (names.length === 0) return ALWAYS
  if (names.some((name) => name.toLowerCase() === ALWAYS)) return names.join(', ')

  return [ALWAYS, ...names].join(', ')
}
