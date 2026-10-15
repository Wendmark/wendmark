import type { Flow } from '@wendmark/core'
import { describe, expect, it } from 'vitest'
import {
  KEEP_FOR_MS,
  addGuide,
  allGuides,
  guidesFor,
  removeGuide,
  setPinned,
  tidy,
  type StorageArea,
  type StoredGuide,
} from './guides'

/** chrome.storage.local, as far as guides need it. */
function memoryArea(initial: Record<string, unknown> = {}): StorageArea & {
  data: Record<string, unknown>
} {
  const data = { ...initial }
  return {
    data,
    get: (key) => Promise.resolve(key in data ? { [key]: data[key] } : {}),
    set: (items) => {
      Object.assign(data, items)
      return Promise.resolve()
    },
  }
}

const flow: Flow = {
  schemaVersion: 1,
  id: 'draft-1',
  name: 'Change your plan',
  steps: [
    {
      type: 'action',
      id: 's1',
      text: 'Go to Subscription',
      dynamic: false,
      target: { selectors: ['nav a:nth-of-type(2)'] },
    },
  ],
}

const DAY = 24 * 60 * 60 * 1000
const NOW = 1_800_000_000_000

function guide(overrides: Partial<StoredGuide>): StoredGuide {
  return { id: 'g', flow, origin: 'https://a.example', createdAt: NOW, pinned: false, ...overrides }
}

describe('tidy', () => {
  it('keeps guides younger than 30 days, and pinned ones of any age', () => {
    const young = guide({ id: 'young', createdAt: NOW - 29 * DAY })
    const old = guide({ id: 'old', createdAt: NOW - 31 * DAY })
    const oldPinned = guide({ id: 'old-pinned', createdAt: NOW - 400 * DAY, pinned: true })

    expect(tidy([young, old, oldPinned], NOW).map((kept) => kept.id)).toEqual([
      'young',
      'old-pinned',
    ])
  })

  it('removes a guide exactly 30 days old', () => {
    expect(tidy([guide({ createdAt: NOW - KEEP_FOR_MS })], NOW)).toEqual([])
  })
})

describe('kept guides', () => {
  it('stores a recording and lists it for its site, newest first', async () => {
    const area = memoryArea()
    await addGuide(area, flow, 'https://a.example', NOW - DAY)
    const newer = await addGuide(area, { ...flow, name: 'Newer' }, 'https://a.example', NOW)
    await addGuide(area, flow, 'https://b.example', NOW)

    const listed = await guidesFor(area, 'https://a.example', NOW)
    expect(listed.map((kept) => kept.flow.name)).toEqual(['Newer', 'Change your plan'])
    expect(listed[0]).toEqual(newer)
    expect(listed[0]?.pinned).toBe(false)
  })

  it('tidies old guides away when read, and writes that back', async () => {
    const area = memoryArea()
    await addGuide(area, flow, 'https://a.example', NOW - 40 * DAY)
    expect(await allGuides(area, NOW)).toEqual([])
    expect(area.data.guides).toEqual([])
  })

  it('keeps a pinned guide past 30 days', async () => {
    const area = memoryArea()
    const kept = await addGuide(area, flow, 'https://a.example', NOW - 40 * DAY)
    await setPinned(area, kept.id, true, NOW - 39 * DAY)

    expect((await allGuides(area, NOW)).map((one) => one.id)).toEqual([kept.id])
  })

  it('removes a guide', async () => {
    const area = memoryArea()
    const kept = await addGuide(area, flow, 'https://a.example', NOW)
    await removeGuide(area, kept.id, NOW)
    expect(await allGuides(area, NOW)).toEqual([])
  })

  it('drops anything in storage that is not a guide', async () => {
    const area = memoryArea({ guides: [{ id: 'x' }, 'nonsense', guide({ id: 'ok' })] })
    expect((await allGuides(area, NOW)).map((one) => one.id)).toEqual(['ok'])
  })
})
