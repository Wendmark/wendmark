import type { Flow } from '@wendmark/core'
import { getDb } from '../db'
import type { AuthorSession } from '../auth/author-tokens'

/**
 * Storing what author mode recorded.
 *
 * An author session can only ever create a draft. Publishing happens in the
 * portal, where a person is signed in and can see what they are publishing —
 * see docs/decisions/author-mode.md. Nothing in this file writes a status.
 */

export interface SavedDraft {
  id: string
  name: string
}

/**
 * Saves a recording as a draft of the session's app.
 *
 * The flow's own id is ignored: it was invented in the browser, and the
 * portal decides what a saved process is called. The app is taken from the
 * session, never from the request, so a session cannot write into another
 * app.
 */
export async function saveAuthorDraft(session: AuthorSession, flow: Flow): Promise<SavedDraft> {
  const created = await getDb().flow.create({
    data: {
      appId: session.appId,
      name: flow.name,
      ...(flow.description === undefined ? {} : { description: flow.description }),
      steps: flow.steps,
      schemaVersion: flow.schemaVersion,
      urlPatterns: [],
      createdById: session.userId,
    },
    select: { id: true, name: true },
  })

  return created
}
