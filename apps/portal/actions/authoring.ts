'use server'

import { requireUser } from '../lib/auth/session'
import { issueAuthorToken } from '../lib/auth/author-tokens'

export type StartAuthoringResult =
  { ok: true; token: string; origin: string } | { ok: false; error: string }

/**
 * Permission to record, for one app, at one address, for one minute.
 *
 * The token goes to the browser, which hands it to the snippet in the
 * customer's app through a message between tabs — never in the address bar.
 * See docs/decisions/author-mode.md.
 */
export async function startAuthoring(appId: string, origin: string): Promise<StartAuthoringResult> {
  const user = await requireUser()

  const result = await issueAuthorToken({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId,
    appId,
    origin,
  })

  if (!result.ok) return { ok: false, error: result.reason }
  return { ok: true, token: result.token, origin: result.origin }
}
