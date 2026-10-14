/**
 * Asking the portal for permission to record, or to replay a report.
 *
 * The snippet invents a code, tells the portal what it would like to do in
 * this app at this address, then waits for the portal — where the person is
 * actually signed in — to approve it and hand back a session.
 *
 * Nothing secret goes through the address bar, and no window talks to
 * another window: Cross-Origin-Opener-Policy severs that on many apps, and
 * we do not control customers' headers. See docs/decisions/author-mode.md.
 */

/** What the portal can send someone here to do. */
export type Purpose = 'record' | 'replay'

/** The hints the portal puts in the address, one per purpose. */
const HINTS = new Map<string, Purpose>([
  ['wm=author', 'record'],
  ['wm=replay', 'replay'],
])

/** How long to keep asking, and how often. */
const POLL_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 1_000

export interface AuthorSession {
  sessionToken: string
  appId: string
  expiresAt: string
}

/** The parts of the address after `#`. */
function hashParts(view: Window): string[] {
  return view.location.hash.replace(/^#/, '').split('&')
}

/** What this page was opened to do, if the portal sent someone here. */
export function requestedPurpose(view: Window): Purpose | null {
  for (const part of hashParts(view)) {
    const purpose = HINTS.get(part)
    if (purpose) return purpose
  }
  return null
}

/** Removes the hint, so a reload or a copied link does not start this again. */
export function clearHint(view: Window): void {
  if (!requestedPurpose(view)) return
  const rest = hashParts(view)
    .filter((part) => !HINTS.has(part))
    .join('&')
  const url = view.location.pathname + view.location.search + (rest ? `#${rest}` : '')
  try {
    view.history.replaceState(null, '', url)
  } catch {
    // Not worth failing over; the code is useless without approval anyway.
  }
}

/** A code only this page knows, to collect its session with later. */
export function generateCode(view: Window): string {
  const bytes = new Uint8Array(32)
  view.crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Tells the portal what this app would like to do. Grants nothing by itself. */
export async function askPermission(
  portalOrigin: string,
  key: string,
  code: string,
  purpose: Purpose,
): Promise<boolean> {
  try {
    const response = await fetch(`${portalOrigin}/api/v1/author/pair/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, code, purpose }),
      mode: 'cors',
      credentials: 'omit',
    })
    return response.ok
  } catch {
    return false
  }
}

/** One attempt at collecting the session. Null means "not yet". */
export async function collectSession(
  portalOrigin: string,
  code: string,
): Promise<AuthorSession | null> {
  try {
    const response = await fetch(`${portalOrigin}/api/v1/author/pair/collect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
      mode: 'cors',
      credentials: 'omit',
    })
    if (response.status !== 200) return null

    const data: unknown = await response.json()
    const session = (data ?? {}) as Partial<AuthorSession>
    if (typeof session.sessionToken !== 'string' || typeof session.appId !== 'string') return null

    return {
      sessionToken: session.sessionToken,
      appId: session.appId,
      expiresAt: typeof session.expiresAt === 'string' ? session.expiresAt : '',
    }
  } catch {
    return null
  }
}

/** Waits for the portal to approve, giving up after a while. */
export async function waitForApproval(
  view: Window,
  portalOrigin: string,
  code: string,
): Promise<AuthorSession | null> {
  const until = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < until) {
    const session = await collectSession(portalOrigin, code)
    if (session) return session
    await new Promise((resolve) => view.setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return null
}
