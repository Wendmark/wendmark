import { describe, expect, it } from 'vitest'
import { makeWorld, reportBody } from '../../test/factories'
import { setReports } from '../apps/service'
import { getDb } from '../db'
import { NotAllowedError } from '../permissions'
import { countReports, deleteReport, eraseReportsFrom, getReport, listReports } from './read'
import { readReport, recordReport } from './write'

/**
 * Reading reports back, and forgetting them.
 *
 * Checked against rows, like writing them: who can see a report, who can
 * delete it, and that a report past its date is never shown.
 */

const from = { origin: 'https://app.example.com' }

async function appWithReports(name = 'Acme') {
  const world = await makeWorld(name)
  await setReports(world.ctx, world.appId, { enabled: true })
  const app = await getDb().app.findUniqueOrThrow({
    where: { id: world.appId },
    select: { publicKey: true },
  })
  return { ...world, publicKey: app.publicKey }
}

async function send(publicKey: string, overrides: Record<string, unknown> = {}) {
  const report = readReport(reportBody(overrides))
  if (!report) throw new Error('the fixture should be a valid report')
  const stored = await recordReport(publicKey, report, from)
  if (!stored) throw new Error('the report should have been stored')
  return stored.id
}

describe('listing reports', () => {
  it('lists an app’s reports, newest first, as stored', async () => {
    const acme = await appWithReports()
    await send(acme.publicKey, { note: 'First' })
    await send(acme.publicKey, { note: 'Second' })

    const reports = await listReports(acme.ctx, acme.appId)
    expect(reports.map((report) => report.note)).toEqual(['Second', 'First'])
    expect(reports[0]?.steps).toBe(2)
    // Masked on write, so masked here: the record id is not in the path.
    expect(reports[0]?.pages).toEqual(['/orders', '/orders/*'])
  })

  it('shows one person’s reports when asked', async () => {
    const acme = await appWithReports()
    await send(acme.publicKey, { userRef: 'customer-7' })
    await send(acme.publicKey, { userRef: 'customer-8' })

    const reports = await listReports(acme.ctx, acme.appId, { userRef: 'customer-7' })
    expect(reports.map((report) => report.userRef)).toEqual(['customer-7'])
  })

  it('never shows another organization’s reports', async () => {
    const acme = await appWithReports('Acme')
    const other = await makeWorld('Other')
    await send(acme.publicKey)

    expect(await listReports(other.ctx, acme.appId)).toEqual([])
    expect(await countReports(other.ctx, acme.appId)).toBe(0)
  })

  it('does not show a viewer anything', async () => {
    const acme = await appWithReports()
    await expect(listReports({ ...acme.ctx, role: 'viewer' }, acme.appId)).rejects.toThrow(
      NotAllowedError,
    )
  })

  it('sweeps expired reports before showing anything', async () => {
    const acme = await appWithReports()
    const id = await send(acme.publicKey)
    await getDb().report.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } })

    expect(await listReports(acme.ctx, acme.appId)).toEqual([])
    expect(await getDb().report.count()).toBe(0)
  })
})

describe('reading one report', () => {
  it('gives the whole report to someone who may read it', async () => {
    const acme = await appWithReports()
    const id = await send(acme.publicKey, { userRef: 'customer-7' })

    const report = await getReport(acme.ctx, id)
    expect(report).toMatchObject({
      id,
      appId: acme.appId,
      labels: 'none',
      origin: 'https://app.example.com',
      userRef: 'customer-7',
      steps: 2,
    })
  })

  it('finds nothing in another organization, or behind a made-up id', async () => {
    const acme = await appWithReports('Acme')
    const other = await makeWorld('Other')
    const id = await send(acme.publicKey)

    expect(await getReport(other.ctx, id)).toBeNull()
    expect(await getReport(acme.ctx, 'not-an-id')).toBeNull()
  })

  it('does not show a report whose time is up', async () => {
    const acme = await appWithReports()
    const id = await send(acme.publicKey)
    await getDb().report.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } })

    expect(await getReport(acme.ctx, id)).toBeNull()
  })
})

describe('forgetting reports', () => {
  it('deletes one report outright', async () => {
    const acme = await appWithReports()
    const id = await send(acme.publicKey)

    expect(await deleteReport({ ...acme.ctx, role: 'editor' }, id)).toEqual({ appId: acme.appId })
    expect(await getDb().report.count()).toBe(0)
  })

  it('will not delete another organization’s report', async () => {
    const acme = await appWithReports('Acme')
    const other = await makeWorld('Other')
    const id = await send(acme.publicKey)

    await expect(deleteReport(other.ctx, id)).rejects.toThrow()
    expect(await getDb().report.count()).toBe(1)
  })

  it('erases everything one person sent, and nobody else’s', async () => {
    const acme = await appWithReports()
    await send(acme.publicKey, { userRef: 'customer-7' })
    await send(acme.publicKey, { userRef: 'customer-7' })
    await send(acme.publicKey, { userRef: 'customer-8' })
    await send(acme.publicKey)

    expect(await eraseReportsFrom(acme.ctx, acme.appId, 'customer-7')).toBe(2)
    const left = await getDb().report.findMany({ select: { userRef: true } })
    expect(left.map((row) => row.userRef).sort()).toEqual(['customer-8', null])
  })

  it('leaves erasing a person to an admin', async () => {
    const acme = await appWithReports()
    await send(acme.publicKey, { userRef: 'customer-7' })

    await expect(
      eraseReportsFrom({ ...acme.ctx, role: 'editor' }, acme.appId, 'customer-7'),
    ).rejects.toThrow(NotAllowedError)
    expect(await getDb().report.count()).toBe(1)
  })

  it('will not erase without saying whose reports', async () => {
    const acme = await appWithReports()
    await send(acme.publicKey)
    await expect(eraseReportsFrom(acme.ctx, acme.appId, '  ')).rejects.toThrow(/whose/)
    expect(await getDb().report.count()).toBe(1)
  })
})
