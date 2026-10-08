import { describe, expect, it } from 'vitest'
import { makeFlow, makeWorld, step } from '../../test/factories'
import { getDb } from '../db'
import { publishFlow, setPaused, setUrlPatterns, setVisibility, deleteFlow } from './service'
import { buildConfig, buildPlayableFlow } from './config'

/**
 * What a snippet is actually served.
 *
 * The rules here decide what an end user sees, so they are worth checking
 * against the database rather than against a mock that agrees with us.
 */

const anywhere = { url: null, formatVersion: 1 }

describe('the processes a snippet is offered', () => {
  it('offers a published one', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Order coffee')
    await publishFlow(world.ctx, flowId)

    const config = await buildConfig(world.appId, anywhere)
    expect(config.flows.map((flow) => flow.name)).toEqual(['Order coffee'])
  })

  it('never mentions a draft', async () => {
    const world = await makeWorld('Acme')
    await makeFlow(world, 'Still a draft')

    expect((await buildConfig(world.appId, anywhere)).flows).toEqual([])
  })

  it('never mentions a paused one', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Paused')
    await publishFlow(world.ctx, flowId)
    await setPaused(world.ctx, flowId, true)

    expect((await buildConfig(world.appId, anywhere)).flows).toEqual([])
  })

  it('never mentions a deleted one', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Deleted')
    await publishFlow(world.ctx, flowId)
    await deleteFlow(world.ctx, flowId)

    expect((await buildConfig(world.appId, anywhere)).flows).toEqual([])
  })

  it('never mentions another app’s', async () => {
    const acme = await makeWorld('Acme')
    const other = await makeWorld('Other')
    const flowId = await makeFlow(acme, 'Acme process')
    await publishFlow(acme.ctx, flowId)

    expect((await buildConfig(other.appId, anywhere)).flows).toEqual([])
  })

  it('serves what was published, not what the author is editing now', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Original name')
    await publishFlow(world.ctx, flowId)

    await getDb().flow.update({ where: { id: flowId }, data: { name: 'Renamed since' } })

    const config = await buildConfig(world.appId, anywhere)
    expect(config.flows[0]?.name).toBe('Original name')
  })
})

describe('where a process says it belongs', () => {
  it('marks it as applying here, rather than leaving it out', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'On the orders page')
    await setUrlPatterns(world.ctx, flowId, ['/orders', '/orders/**'])
    await publishFlow(world.ctx, flowId)

    const here = await buildConfig(world.appId, { url: '/orders/10421', formatVersion: 1 })
    const elsewhere = await buildConfig(world.appId, { url: '/profile', formatVersion: 1 })

    // Offered in both answers; only the flag differs, so the launcher can
    // lead with what is useful here and still show the rest.
    expect(here.flows[0]?.appliesHere).toBe(true)
    expect(elsewhere.flows[0]?.appliesHere).toBe(false)
  })
})

describe('a hidden process', () => {
  it('is not listed', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Hidden')
    await setVisibility(world.ctx, flowId, false)
    await publishFlow(world.ctx, flowId)

    expect((await buildConfig(world.appId, anywhere)).flows).toEqual([])
  })

  it('still plays when an app asks for it by id', async () => {
    // Hiding is about the launcher's list, not permission — this is the
    // whole point of hiding something, and it was broken until #30.
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Hidden', [step('s1', 'Do the thing')])
    await setVisibility(world.ctx, flowId, false)
    await publishFlow(world.ctx, flowId)

    const flow = await buildPlayableFlow(world.appId, flowId, 1)
    expect(flow).not.toBeNull()
    expect((flow as { name: string }).name).toBe('Hidden')
  })

  it('does not play for another app', async () => {
    const acme = await makeWorld('Acme')
    const other = await makeWorld('Other')
    const flowId = await makeFlow(acme, 'Acme process')
    await publishFlow(acme.ctx, flowId)

    expect(await buildPlayableFlow(other.appId, flowId, 1)).toBeNull()
  })

  it('does not play while it is only a draft', async () => {
    const world = await makeWorld('Acme')
    const flowId = await makeFlow(world, 'Draft')

    expect(await buildPlayableFlow(world.appId, flowId, 1)).toBeNull()
  })
})
