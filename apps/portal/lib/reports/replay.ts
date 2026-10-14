import type { Step } from '@wendmark/core'
import type { Context } from '../apps/service'
import type { ReplaySession } from '../auth/author-tokens'
import { approvePairing, listPendingPairings } from '../auth/pairing'
import { getDb } from '../db'
import { getReport } from './read'
import { readSteps } from './view'
import { purgeExpiredReports } from './write'

/**
 * Replaying a report in the app it came from.
 *
 * Somebody in the portal presses Replay; the app opens with a hint; the
 * snippet there asks to replay, and the portal approves it for that one
 * report. The snippet then reads the report's steps and plays them with the
 * teaching cursor. The person replaying does the clicking: Wendmark still
 * only points. See docs/decisions/problem-reports.md.
 */

export type ReplayWaitResult =
  | { status: 'approved'; origin: string }
  | { status: 'waiting' }
  | { status: 'error'; error: string }

/**
 * Approves the snippet asking to replay this report from this address, if
 * it has asked yet. The click on Replay is the approval; this matches it to
 * the request that arrives moments later.
 */
export async function approveWaitingReplay(
  ctx: Context,
  reportId: string,
  origin: string,
): Promise<ReplayWaitResult> {
  const report = await getReport(ctx, reportId)
  if (!report) return { status: 'error', error: 'That report does not exist any more.' }

  const pending = await listPendingPairings(ctx, report.appId, 'replay')
  const match = pending.find((request) => request.origin === origin)
  if (!match) return { status: 'waiting' }

  const approved = await approvePairing(ctx, report.appId, match.id, {
    purpose: 'replay',
    reportId: report.id,
  })
  if (!approved.ok) return { status: 'error', error: approved.reason }

  return { status: 'approved', origin: approved.origin }
}

/** What the snippet receives to replay. */
export interface ReplayReport {
  id: string
  note: string
  createdAt: string
  /** The steps this portal can read; any it cannot are left out. */
  steps: Step[]
}

/**
 * The one report a replay session was approved for, or null.
 *
 * Swept for retention first, like every other read: a report past its date
 * is gone, whoever asks.
 */
export async function reportForReplay(session: ReplaySession): Promise<ReplayReport | null> {
  await purgeExpiredReports()

  const row = await getDb().report.findFirst({
    where: { id: session.reportId, appId: session.appId },
    select: { id: true, note: true, steps: true, createdAt: true },
  })
  if (!row) return null

  return {
    id: row.id,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    steps: readSteps(row.steps).filter((step): step is Step => step !== null),
  }
}
