import type { Step } from '@wendmark/core'
import { getDb } from '../lib/db'
import { generatePublicKey } from '../lib/apps/keys'
import type { Context } from '../lib/apps/service'

/**
 * The smallest amount of world a test needs.
 *
 * Each helper returns what a test is likely to assert on, and nothing else.
 * Names are given rather than generated, so a failing test says which row it
 * meant.
 */

export function step(id: string, text = `Step ${id}`): Step {
  return {
    id,
    type: 'action',
    text,
    dynamic: false,
    target: { selectors: [`#${id}`], role: 'button', name: text },
  }
}

export interface World {
  ctx: Context
  organizationId: string
  userId: string
  appId: string
}

/** An organization with one administrator and one app. */
export async function makeWorld(name = 'Acme'): Promise<World> {
  const organization = await getDb().organization.create({
    data: {
      name,
      memberships: {
        create: {
          role: 'admin',
          user: { create: { email: `admin@${name.toLowerCase()}.test`, name: `${name} Admin` } },
        },
      },
    },
    include: { memberships: true },
  })

  const membership = organization.memberships[0]
  if (!membership) throw new Error('membership was not created')

  const app = await getDb().app.create({
    data: {
      organizationId: organization.id,
      name: `${name} app`,
      origins: ['https://app.example.com'],
      // A real one. Spelling the app's name into a key looked friendlier and
      // was a trap: the key alphabet leaves out look-alike characters, so
      // any name containing i, l, o or u produced a key `isPublicKey`
      // rejects — and a test asserting that nothing was written then passed
      // for the wrong reason.
      publicKey: generatePublicKey(),
    },
  })

  return {
    ctx: { userId: membership.userId, organizationId: organization.id, role: 'admin' },
    organizationId: organization.id,
    userId: membership.userId,
    appId: app.id,
  }
}

/** A draft process belonging to a world's app. */
export async function makeFlow(
  world: World,
  name: string,
  steps: Step[] = [step('s1')],
): Promise<string> {
  const flow = await getDb().flow.create({
    data: {
      appId: world.appId,
      name,
      steps,
      createdById: world.userId,
      urlPatterns: [],
    },
    select: { id: true },
  })
  return flow.id
}

/** The processes of an app, in the order the portal lists them. */
export async function flowNames(appId: string): Promise<string[]> {
  const rows = await getDb().flow.findMany({
    where: { appId, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: { name: true },
  })
  return rows.map((row) => row.name)
}

/**
 * A report as the snippet would send one, with the labels still on it.
 *
 * Deliberately full of things that must not survive the default policy: an
 * order number in the accessible name, a customer's name in the section
 * label, a record id in the page.
 */
export function reportBody(overrides: Record<string, unknown> = {}) {
  return {
    reportVersion: 1,
    note: 'Refunding this order does nothing at all.',
    steps: [
      {
        type: 'action',
        id: 's1',
        text: 'Go to Order FK-10421',
        dynamic: true,
        target: {
          selectors: ['table tr:nth-of-type(2) > td > a'],
          role: 'link',
          name: 'Order FK-10421',
          text: 'FK-10421',
          context: "Alex Lindqvist's orders",
          url: '/orders/10421',
        },
      },
      {
        type: 'action',
        id: 's2',
        text: 'Click Issue refund',
        dynamic: false,
        target: {
          selectors: ['#issue-refund'],
          role: 'button',
          name: 'Issue refund',
          url: '/orders/10421',
        },
      },
    ],
    pages: ['/orders', '/orders/10421'],
    labels: 'none',
    userAgent: 'Mozilla/5.0 (Macintosh)',
    snippetVersion: '0.0.0',
    ...overrides,
  }
}
