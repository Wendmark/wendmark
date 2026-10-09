import { describe, expect, it } from 'vitest'
import { makeWorld, reportBody } from '../../test/factories'
import { setReports } from '../apps/service'
import { getDb } from '../db'
import { expiryFrom, purgeExpiredReports, readReport, recordReport } from './write'

/**
 * What actually lands in the database when somebody reports a problem.
 *
 * This is the one table that can hold an app's own customers' data, and the
 * promise made about it in docs/decisions/problem-reports.md is a promise
 * about rows. So it is checked against rows, not against the function that
 * writes them.
 */

const from = { origin: 'https://app.example.com' }

/** An app with reports switched on, and its public key. */
async function appWithReports(
  name = 'Acme',
  options: { labels?: 'none' | 'all'; retentionDays?: number } = {},
) {
  const world = await makeWorld(name)
  await setReports(world.ctx, world.appId, { enabled: true, ...options })
  const app = await getDb().app.findUniqueOrThrow({
    where: { id: world.appId },
    select: { publicKey: true },
  })
  return { ...world, publicKey: app.publicKey }
}

function parsed(overrides: Record<string, unknown> = {}) {
  const report = readReport(reportBody(overrides))
  if (!report) throw new Error('the fixture should be a valid report')
  return report
}

describe('writing a report', () => {
  it('stores it for the app whose key sent it', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    const rows = await getDb().report.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.appId).toBe(acme.appId)
    expect(rows[0]?.note).toBe('Refunding this order does nothing at all.')
    expect(rows[0]?.origin).toBe('https://app.example.com')
  })

  it('stores nothing at all when the app has not turned reports on', async () => {
    const world = await makeWorld('Quiet')
    const app = await getDb().app.findUniqueOrThrow({
      where: { id: world.appId },
      select: { publicKey: true },
    })

    expect(await recordReport(app.publicKey, parsed(), from)).toBeNull()
    expect(await getDb().report.count()).toBe(0)
  })

  it('stores nothing for a key that belongs to nobody', async () => {
    expect(await recordReport('wm_nosuchkeyatall00', parsed(), from)).toBeNull()
    expect(await getDb().report.count()).toBe(0)
  })
})

describe('what a stored report contains', () => {
  it('has had the labels taken off it', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    const row = await getDb().report.findFirstOrThrow()
    const stored = JSON.stringify(row.steps)

    expect(stored).not.toContain('FK-10421')
    expect(stored).not.toContain('Alex Lindqvist')
    expect(stored).not.toContain('Issue refund')
    // And what finds the element again is still there.
    expect(stored).toContain('#issue-refund')
  })

  it('has had the ids taken out of its pages', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    const row = await getDb().report.findFirstOrThrow()
    expect(row.pages).toEqual(['/orders', '/orders/*'])
  })

  it('ignores the policy the sender claimed and applies the app’s own', async () => {
    // The whole reason the portal masks again. A snippet is a file on
    // somebody else's server, and a report arriving with labels: "none"
    // still has to be stripped by us before it is believed.
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed({ labels: 'all' }), from)

    const row = await getDb().report.findFirstOrThrow()
    expect(row.labels).toBe('none')
    expect(JSON.stringify(row.steps)).not.toContain('FK-10421')
  })

  it('keeps the labels when the app has asked for them', async () => {
    const acme = await appWithReports('Loud', { labels: 'all' })
    await recordReport(acme.publicKey, parsed({ labels: 'none' }), from)

    const row = await getDb().report.findFirstOrThrow()
    expect(row.labels).toBe('all')
    expect(JSON.stringify(row.steps)).toContain('Issue refund')
    expect(row.pages).toEqual(['/orders', '/orders/10421'])
  })

  it('keeps an identifier the app passed, exactly as given', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed({ userRef: 'customer-91873' }), from)

    expect((await getDb().report.findFirstOrThrow()).userRef).toBe('customer-91873')
  })

  it('has no identifier when the app passed none', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    expect((await getDb().report.findFirstOrThrow()).userRef).toBeNull()
  })
})

describe('retention', () => {
  it('decides the date when the row is written', async () => {
    const acme = await appWithReports('Acme', { retentionDays: 30 })
    const before = Date.now()
    await recordReport(acme.publicKey, parsed(), from)

    const row = await getDb().report.findFirstOrThrow()
    const days = (row.expiresAt.getTime() - before) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThan(29.9)
    expect(days).toBeLessThan(30.1)
  })

  it('uses ninety days when the app has not chosen', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    const row = await getDb().report.findFirstOrThrow()
    const days = (row.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    expect(Math.round(days)).toBe(90)
  })

  it('deletes a report outright once its date has passed', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    await getDb().report.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
    expect(await purgeExpiredReports()).toBe(1)
    // Gone, not hidden: there is no soft delete to look behind.
    expect(await getDb().report.count()).toBe(0)
  })

  it('leaves a report that is still within its retention', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    expect(await purgeExpiredReports()).toBe(0)
    expect(await getDb().report.count()).toBe(1)
  })

  it('sweeps as a side effect of the next report arriving', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)
    await getDb().report.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })

    await recordReport(acme.publicKey, parsed({ note: 'Still broken.' }), from)

    const rows = await getDb().report.findMany()
    expect(rows.map((row) => row.note)).toEqual(['Still broken.'])
  })

  it('goes with the app when the app is deleted', async () => {
    const acme = await appWithReports()
    await recordReport(acme.publicKey, parsed(), from)

    await getDb().app.delete({ where: { id: acme.appId } })
    expect(await getDb().report.count()).toBe(0)
  })
})

describe('expiryFrom', () => {
  it('counts whole days forward', () => {
    const now = new Date('2026-10-09T12:00:00.000Z')
    expect(expiryFrom(now, 90).toISOString()).toBe('2027-01-07T12:00:00.000Z')
  })
})
