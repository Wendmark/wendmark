import { describe, expect, it } from 'vitest'
import { makeWorld, reportBody } from '../../test/factories'
import { setReports } from '../apps/service'
import { verifyAuthorSession, verifyReplaySession } from '../auth/author-tokens'
import { approvePairing, collectPairing, listPendingPairings, startPairing } from '../auth/pairing'
import { getDb } from '../db'
import { NotAllowedError } from '../permissions'
import { approveWaitingReplay, reportForReplay } from './replay'
import { readReport, recordReport } from './write'

/**
 * Replaying a report: a session that may read one report, and nothing else.
 *
 * Checked against rows, because the point is what each session is *not*
 * allowed to do.
 */

const ORIGIN = 'https://app.example.com'

async function appWithReport(name = 'Acme') {
  const world = await makeWorld(name)
  await setReports(world.ctx, world.appId, { enabled: true })
  const { publicKey } = await getDb().app.findUniqueOrThrow({
    where: { id: world.appId },
    select: { publicKey: true },
  })
  const report = readReport(reportBody({ note: 'The plan did not change' }))
  if (!report) throw new Error('the fixture should be a valid report')
  const stored = await recordReport(publicKey, report, { origin: ORIGIN })
  if (!stored) throw new Error('the report should have been stored')
  return { ...world, publicKey, reportId: stored.id }
}

/** The snippet's half: ask, then collect once approved. */
async function ask(publicKey: string, code: string, purpose: 'record' | 'replay') {
  await startPairing({ key: publicKey, origin: ORIGIN, code, purpose })
}

describe('replaying a report', () => {
  it('approves the waiting app for that report, which it can then read', async () => {
    const acme = await appWithReport()
    await ask(acme.publicKey, 'code-1', 'replay')

    expect(await approveWaitingReplay(acme.ctx, acme.reportId, ORIGIN)).toEqual({
      status: 'approved',
      origin: ORIGIN,
    })

    const collected = await collectPairing('code-1', ORIGIN)
    if (!collected.ok) throw new Error('should have collected a session')

    const session = await verifyReplaySession(collected.sessionToken, ORIGIN)
    expect(session?.reportId).toBe(acme.reportId)

    const report = session ? await reportForReplay(session) : null
    expect(report?.note).toBe('The plan did not change')
    expect(report?.steps).toHaveLength(2)
  })

  it('keeps waiting until the app asks', async () => {
    const acme = await appWithReport()
    expect(await approveWaitingReplay(acme.ctx, acme.reportId, ORIGIN)).toEqual({
      status: 'waiting',
    })
  })

  it('never approves a request to record as a replay, or the other way round', async () => {
    const acme = await appWithReport()
    await ask(acme.publicKey, 'record-code', 'record')

    expect(await approveWaitingReplay(acme.ctx, acme.reportId, ORIGIN)).toEqual({
      status: 'waiting',
    })

    await ask(acme.publicKey, 'replay-code', 'replay')
    const forRecording = await listPendingPairings(acme.ctx, acme.appId, 'record')
    expect(forRecording).toHaveLength(1)
    const replayRequest = (await listPendingPairings(acme.ctx, acme.appId, 'replay'))[0]
    if (!replayRequest) throw new Error('the replay request should be waiting')
    // Approving it as a recording finds nothing to approve.
    const approved = await approvePairing(acme.ctx, acme.appId, replayRequest.id)
    expect(approved.ok).toBe(false)
  })

  it('gives a session that cannot save drafts', async () => {
    const acme = await appWithReport()
    await ask(acme.publicKey, 'code-2', 'replay')
    await approveWaitingReplay(acme.ctx, acme.reportId, ORIGIN)
    const collected = await collectPairing('code-2', ORIGIN)
    if (!collected.ok) throw new Error('should have collected a session')

    expect(await verifyAuthorSession(collected.sessionToken, ORIGIN)).toBeNull()
  })

  it('does not let a recording session read reports', async () => {
    const acme = await appWithReport()
    await ask(acme.publicKey, 'code-3', 'record')
    const request = (await listPendingPairings(acme.ctx, acme.appId, 'record'))[0]
    if (!request) throw new Error('the request should be waiting')
    await approvePairing(acme.ctx, acme.appId, request.id)
    const collected = await collectPairing('code-3', ORIGIN)
    if (!collected.ok) throw new Error('should have collected a session')

    expect(await verifyReplaySession(collected.sessionToken, ORIGIN)).toBeNull()
  })

  it('is refused from another address', async () => {
    const acme = await appWithReport()
    await ask(acme.publicKey, 'code-4', 'replay')
    await approveWaitingReplay(acme.ctx, acme.reportId, ORIGIN)
    const collected = await collectPairing('code-4', ORIGIN)
    if (!collected.ok) throw new Error('should have collected a session')

    expect(await verifyReplaySession(collected.sessionToken, 'https://evil.example')).toBeNull()
  })

  it('cannot replay another organization’s report', async () => {
    const acme = await appWithReport('Acme')
    const other = await makeWorld('Other')
    await ask(acme.publicKey, 'code-5', 'replay')

    expect(await approveWaitingReplay(other.ctx, acme.reportId, ORIGIN)).toEqual({
      status: 'error',
      error: 'That report does not exist any more.',
    })
  })

  it('is not for viewers', async () => {
    const acme = await appWithReport()
    await expect(
      approveWaitingReplay({ ...acme.ctx, role: 'viewer' }, acme.reportId, ORIGIN),
    ).rejects.toThrow(NotAllowedError)
  })

  it('reads nothing once the report is past its date', async () => {
    const acme = await appWithReport()
    await ask(acme.publicKey, 'code-6', 'replay')
    await approveWaitingReplay(acme.ctx, acme.reportId, ORIGIN)
    const collected = await collectPairing('code-6', ORIGIN)
    if (!collected.ok) throw new Error('should have collected a session')
    const session = await verifyReplaySession(collected.sessionToken, ORIGIN)
    if (!session) throw new Error('should have a session')

    await getDb().report.update({
      where: { id: acme.reportId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    expect(await reportForReplay(session)).toBeNull()
  })
})
