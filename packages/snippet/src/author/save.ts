import type { Flow } from '@wendmark/core'

/**
 * Sending a finished recording to the portal.
 *
 * It is always saved as a draft: the author reviews and publishes it in the
 * portal, where they can see what they are about to show their users.
 */

export type SaveResult = { ok: true; id: string; name: string } | { ok: false; error: string }

/** What could not be said in words if the portal never answered. */
const UNREACHABLE = 'Could not reach the portal. Check your connection and try again.'

export async function saveDraft(
  portalOrigin: string,
  sessionToken: string,
  flow: Flow,
): Promise<SaveResult> {
  let response: Response
  try {
    response = await fetch(`${portalOrigin}/api/v1/author/flows`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionToken, flow }),
      mode: 'cors',
      credentials: 'omit',
    })
  } catch {
    return { ok: false, error: UNREACHABLE }
  }

  const body: unknown = await response.json().catch(() => null)
  const field = (name: string): string => {
    const value = (body as Record<string, unknown> | null)?.[name]
    return typeof value === 'string' ? value : ''
  }

  if (!response.ok) {
    return { ok: false, error: field('error') || 'The portal would not save that recording.' }
  }

  const id = field('id')
  if (!id) return { ok: false, error: 'The portal saved something unexpected.' }

  return { ok: true, id, name: field('name') }
}
