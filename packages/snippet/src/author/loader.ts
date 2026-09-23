import type { AuthorSession } from './pairing'

/**
 * The authoring UI is a separate file, fetched only for the few people who
 * record a process. Ordinary visitors — the overwhelming majority of page
 * loads — never download it, which is what keeps the snippet small.
 */

/** The global the author bundle exposes. */
const GLOBAL = 'WendmarkAuthor'

export interface AuthorContext {
  session: AuthorSession
  portalOrigin: string
  doc: Document
  view: Window
}

export interface AuthorApi {
  start: (context: AuthorContext) => void
}

/** Whatever the author bundle put on the window, if it is loaded. */
function loaded(view: Window): AuthorApi | null {
  const candidate = (view as unknown as Record<string, unknown>)[GLOBAL]
  if (typeof candidate !== 'object' || candidate === null) return null
  const api = candidate as Partial<AuthorApi>
  return typeof api.start === 'function' ? (api as AuthorApi) : null
}

/** Fetches the authoring UI from the portal that granted the session. */
export function loadAuthorBundle(
  doc: Document,
  view: Window,
  portalOrigin: string,
): Promise<AuthorApi | null> {
  const already = loaded(view)
  if (already) return Promise.resolve(already)

  return new Promise((resolve) => {
    const script = doc.createElement('script')
    script.src = `${portalOrigin}/author.js`
    script.async = true
    script.addEventListener('load', () => {
      resolve(loaded(view))
    })
    script.addEventListener('error', () => {
      resolve(null)
    })
    doc.head.appendChild(script)
  })
}
