/**
 * Telling the portal the snippet is installed.
 *
 * This is how an app's page in the portal stops saying "waiting for the
 * snippet". It sends the app's public key and the page's origin, and nothing
 * about the person browsing. It never blocks the host page, and a portal
 * that is unreachable changes nothing.
 */

/** Only ping once per tab: a busy site should not chat on every page load. */
const SENT_KEY = 'wendmark:pinged'

/** The script tag the customer pasted, whichever way we can find it. */
function ourScript(doc: Document): HTMLScriptElement | null {
  const current = doc.currentScript
  if (current instanceof HTMLScriptElement) return current
  return doc.querySelector<HTMLScriptElement>('script[data-app]')
}

/** Where the snippet was served from, which is where the portal lives. */
export function portalOrigin(doc: Document): string | null {
  const source = ourScript(doc)?.src ?? ''
  if (!source) return null
  try {
    return new URL(source, doc.baseURI).origin
  } catch {
    return null
  }
}

/** The app key from the script tag, if the customer set one. */
export function appKey(doc: Document): string | null {
  return ourScript(doc)?.getAttribute('data-app') ?? null
}

/** Whether this tab has already said hello. */
function alreadySent(view: Window): boolean {
  try {
    if (view.sessionStorage.getItem(SENT_KEY) === '1') return true
    view.sessionStorage.setItem(SENT_KEY, '1')
    return false
  } catch {
    // No storage (private mode, blocked): ping anyway rather than never.
    return false
  }
}

/** Sends the ping, once per tab, without making the page wait. */
export function sendInstallPing(doc: Document, view: Window, version: string): void {
  const key = appKey(doc)
  const portal = portalOrigin(doc)
  if (!key || !portal) return
  if (alreadySent(view)) return

  const body = JSON.stringify({ key, origin: view.location.origin, version })

  try {
    // keepalive: the request survives the page being navigated away from.
    void fetch(`${portal}/api/v1/ping`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).catch(() => {
      // A portal that is down must never surface in a customer's console.
    })
  } catch {
    // Old browser, blocked request: guidance still works without this.
  }
}
