import { describe, expect, it } from 'vitest'
import type { FlowSummary } from '../portal/client'
import { isEmpty, loadCompleted, markCompleted, sectionFlows } from './state'

function flow(id: string, appliesHere = true): FlowSummary {
  return { id, name: `Process ${id}`, description: null, steps: 2, appliesHere }
}

/** Storage that behaves, and storage that does not. */
function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  } as Storage
}

function brokenStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  } as unknown as Storage
}

describe('sectionFlows', () => {
  it('leads with what the user was partway through', () => {
    const sections = sectionFlows({
      flows: [flow('a'), flow('b')],
      unfinishedId: 'b',
      completedIds: [],
    })
    expect(sections.unfinished?.id).toBe('b')
  })

  it('does not repeat the unfinished process further down', () => {
    const sections = sectionFlows({
      flows: [flow('a'), flow('b')],
      unfinishedId: 'b',
      completedIds: [],
    })
    expect(sections.here.map((one) => one.id)).toEqual(['a'])
  })

  it('separates what belongs here from what does not', () => {
    const sections = sectionFlows({
      flows: [flow('a', true), flow('b', false)],
      unfinishedId: null,
      completedIds: [],
    })
    expect(sections.here.map((one) => one.id)).toEqual(['a'])
    expect(sections.elsewhere.map((one) => one.id)).toEqual(['b'])
  })

  it('has no unfinished process when the saved one is no longer published', () => {
    const sections = sectionFlows({
      flows: [flow('a')],
      unfinishedId: 'gone',
      completedIds: [],
    })
    expect(sections.unfinished).toBeNull()
    expect(sections.here).toHaveLength(1)
  })

  it('is empty when an app publishes nothing', () => {
    const sections = sectionFlows({ flows: [], unfinishedId: null, completedIds: [] })
    expect(isEmpty(sections)).toBe(true)
  })

  it('is not empty when only an unfinished process is left', () => {
    const sections = sectionFlows({
      flows: [flow('a')],
      unfinishedId: 'a',
      completedIds: [],
    })
    expect(isEmpty(sections)).toBe(false)
  })
})

describe('completed processes', () => {
  it('remembers one that was finished', () => {
    const storage = memoryStorage()
    markCompleted(storage, 'a')
    expect(loadCompleted(storage)).toEqual(['a'])
  })

  it('does not record the same one twice', () => {
    const storage = memoryStorage()
    markCompleted(storage, 'a')
    markCompleted(storage, 'a')
    expect(loadCompleted(storage)).toEqual(['a'])
  })

  it('keeps the list from growing without end', () => {
    const storage = memoryStorage()
    for (let index = 0; index < 60; index += 1) markCompleted(storage, `f${index}`)

    const completed = loadCompleted(storage)
    expect(completed).toHaveLength(50)
    expect(completed.at(-1)).toBe('f59')
  })

  it('reads nothing from storage that was never written', () => {
    expect(loadCompleted(memoryStorage())).toEqual([])
    expect(loadCompleted(undefined)).toEqual([])
  })

  it('survives storage holding something else entirely', () => {
    const storage = memoryStorage()
    storage.setItem('wendmark:completed', 'not json')
    expect(loadCompleted(storage)).toEqual([])

    storage.setItem('wendmark:completed', '{"a":1}')
    expect(loadCompleted(storage)).toEqual([])

    storage.setItem('wendmark:completed', '["a", 2, null]')
    expect(loadCompleted(storage)).toEqual(['a'])
  })

  it('does nothing loud when storage is blocked', () => {
    const storage = brokenStorage()
    expect(() => markCompleted(storage, 'a')).not.toThrow()
    expect(loadCompleted(storage)).toEqual([])
  })
})
