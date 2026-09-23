'use server'

import { requireUser } from '../lib/auth/session'
import { approvePairing, listPendingPairings } from '../lib/auth/pairing'

export type WaitResult =
  | { status: 'approved'; origin: string }
  | { status: 'waiting' }
  | { status: 'error'; error: string }

/**
 * Approves a snippet that is asking to record.
 *
 * The portal page calls this while the author waits: their click on "Record
 * a process" is the approval, and this matches it to the request that
 * arrives from their app moments later. The origin must be one the app is
 * registered on, so another site cannot slip in.
 */
export async function approveWaitingRecorder(appId: string, origin: string): Promise<WaitResult> {
  const user = await requireUser()
  const ctx = { userId: user.id, organizationId: user.organizationId, role: user.role }

  const pending = await listPendingPairings(ctx, appId)
  const match = pending.find((request) => request.origin === origin)
  if (!match) return { status: 'waiting' }

  const approved = await approvePairing(ctx, appId, match.id)
  if (!approved.ok) return { status: 'error', error: approved.reason }

  return { status: 'approved', origin: approved.origin }
}
