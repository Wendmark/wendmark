import { describe, expect, it } from 'vitest'
import { flowNames, makeFlow, makeWorld, step, type World } from '../../test/factories'
import { getDb } from '../db'
import { NotFoundError } from '../apps/service'
import {
  getFlow,
  listFlows,
  listVersions,
  moveFlowInList,
  publishFlow,
  publishingState,
  restoreVersion,
  retitleFlowStep,
  saveAuthorDraft,
  setUrlPatterns,
  unpublishFlow,
} from './service'

/**
 * The service layer against a real Postgres.
 *
 * These cover the things a unit test cannot: that two queries agree on an
 * order, that a frozen version really is frozen, and that one organization
 * cannot see another's work.
 */

describe('what an organization can reach', () => {
  it('does not show another organization its neighbour’s processes', async () => {
    const acme = await makeWorld('Acme')
    const other = await makeWorld('Other')
    await makeFlow(acme, 'Acme process')

    expect(await listFlows(other.ctx, acme.appId)).toEqual([])
  })

  it('answers with nothing rather than admitting a process exists', async () => {
    const acme = await makeWorld('Acme')
    const other = await makeWorld('Other')
    const flowId = await makeFlow(acme, 'Acme process')

    // Null rather than an error: the portal must not be usable to discover
    // that an id is real.
    expect(await getFlow(other.ctx, flowId)).toBeNull()
  })

  it('refuses to edit a process belonging to someone else', async () => {
    const acme = await makeWorld('Acme')
    const other = await makeWorld('Other')
    const flowId = await makeFlow(acme, 'Acme process')

    await expect(retitleFlowStep(other.ctx, flowId, 's1', 'Hijacked')).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})

describe('the order processes are listed in', () => {
  /**
   * The bug this exists for: listFlows ordered by `sortOrder, updatedAt desc`
   * while moveFlowInList read `sortOrder, createdAt asc`. Every row starts at
   * sortOrder 0, so the first move renumbered an order nobody was looking at
   * and scrambled the list. Two queries disagreeing is exactly what a unit
   * test cannot catch.
   */
  async function fourProcesses(): Promise<World> {
    const world = await makeWorld('Acme')
    for (const name of ['One', 'Two', 'Three', 'Four']) {
      await makeFlow(world, name)
    }
    return world
  }

  it('moves a process up by exactly one place, leaving the rest alone', async () => {
    const world = await fourProcesses()
    const before = await flowNames(world.appId)
    const third = before[2]
    if (!third) throw new Error('expected four processes')

    const flows = await listFlows(world.ctx, world.appId)
    const target = flows.find((flow) => flow.name === third)
    if (!target) throw new Error('expected to find the third process')

    await moveFlowInList(world.ctx, world.appId, target.id, -1)

    const after = await flowNames(world.appId)
    expect(after).toEqual([before[0], before[2], before[1], before[3]])
  })

  it('does nothing at the top of the list', async () => {
    const world = await fourProcesses()
    const before = await flowNames(world.appId)
    const flows = await listFlows(world.ctx, world.appId)
    const first = flows[0]
    if (!first) throw new Error('expected a first process')

    await moveFlowInList(world.ctx, world.appId, first.id, -1)

    expect(await flowNames(world.appId)).toEqual(before)
  })

  it('shows the same order the move was calculated from', async () => {
    // Moving twice in a row only behaves if each move read the order the
    // previous one produced.
    const world = await fourProcesses()
    const flows = await listFlows(world.ctx, world.appId)
    const last = flows[3]
    if (!last) throw new Error('expected four processes')

    await moveFlowInList(world.ctx, world.appId, last.id, -1)
    await moveFlowInList(world.ctx, world.appId, last.id, -1)

    const after = await flowNames(world.appId)
    expect(after.indexOf(last.name)).toBe(1)
    expect(after).toHaveLength(4)
  })
})

describe('publishing', () => {
  it('freezes what users see, so editing afterwards does not disturb them', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Order coffee', [step('s1', 'Open the cart')])

    await publishFlow(world.ctx, flowId)
    await retitleFlowStep(world.ctx, flowId, 's1', 'Open the basket')

    const [published] = await listVersions(world.ctx, flowId)
    expect(published?.version).toBe(1)

    const version = await getDb().flowVersion.findFirstOrThrow({ where: { flowId } })
    const steps = version.steps as { text: string }[]
    expect(steps[0]?.text).toBe('Open the cart')

    // The draft has moved on, and the portal says so.
    expect(await publishingState(world.ctx, flowId)).toBe('edited-since')
  })

  it('counts a change of targeting as something to publish', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Order coffee')
    await publishFlow(world.ctx, flowId)

    expect(await publishingState(world.ctx, flowId)).toBe('up-to-date')
    await setUrlPatterns(world.ctx, flowId, ['/orders'])
    expect(await publishingState(world.ctx, flowId)).toBe('edited-since')
  })

  it('rolls back by publishing the old content again, keeping the history', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Order coffee', [step('s1', 'First wording')])

    await publishFlow(world.ctx, flowId)
    await retitleFlowStep(world.ctx, flowId, 's1', 'Second wording')
    await publishFlow(world.ctx, flowId)

    const versions = await listVersions(world.ctx, flowId)
    const first = versions.find((one) => one.version === 1)
    if (!first) throw new Error('expected version 1')

    await restoreVersion(world.ctx, flowId, first.id)

    const after = await listVersions(world.ctx, flowId)
    expect(after.map((one) => one.version)).toEqual([3, 2, 1])
    expect(after[0]?.isLive).toBe(true)

    const live = await getDb().flowVersion.findFirstOrThrow({ where: { flowId, version: 3 } })
    const steps = live.steps as { text: string }[]
    expect(steps[0]?.text).toBe('First wording')
  })

  it('keeps the versions when a process goes back to being a draft', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Order coffee')
    await publishFlow(world.ctx, flowId)
    await unpublishFlow(world.ctx, flowId)

    const versions = await listVersions(world.ctx, flowId)
    expect(versions).toHaveLength(1)
    // Nothing is being served, so nothing is live.
    expect(versions[0]?.isLive).toBe(false)
  })

  it('refuses to publish a process with no steps', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Empty', [])

    await expect(publishFlow(world.ctx, flowId)).rejects.toThrow(/at least one step/)
  })
})

describe('what author mode may write', () => {
  it('saves a draft of the session’s app, whatever the request says', async () => {
    const world = await makeWorld('Acme')
    const other = await makeWorld('Other')

    const saved = await saveAuthorDraft(
      {
        appId: world.appId,
        userId: world.userId,
        origin: 'https://app.example.com',
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        schemaVersion: 1,
        // An id invented in the browser, which the portal ignores.
        id: 'draft-1',
        name: 'Recorded in the app',
        steps: [step('s1')],
      },
    )

    const row = await getDb().flow.findUniqueOrThrow({ where: { id: saved.id } })
    expect(row.appId).toBe(world.appId)
    expect(row.appId).not.toBe(other.appId)
    expect(row.id).not.toBe('draft-1')
  })

  it('can only ever create a draft', async () => {
    const world = await makeWorld('Acme')

    const saved = await saveAuthorDraft(
      {
        appId: world.appId,
        userId: world.userId,
        origin: 'https://app.example.com',
        expiresAt: new Date(Date.now() + 60_000),
      },
      { schemaVersion: 1, id: 'draft-1', name: 'Recorded', steps: [step('s1')] },
    )

    const row = await getDb().flow.findUniqueOrThrow({ where: { id: saved.id } })
    expect(row.status).toBe('draft')
  })
})
