import { describe, expect, it } from 'vitest'
import {
  describePublishState,
  hasUnpublishedChanges,
  nextVersion,
  publishState,
  type Snapshot,
} from './versions'

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    name: 'Order coffee',
    description: null,
    steps: [{ id: 's1', type: 'action', text: 'Click Cart' }],
    schemaVersion: 1,
    urlPatterns: [],
    ...overrides,
  }
}

describe('nextVersion', () => {
  it('starts at one', () => {
    expect(nextVersion([])).toBe(1)
  })

  it('follows the highest number so far', () => {
    expect(nextVersion([{ version: 1 }, { version: 2 }])).toBe(3)
  })

  it('never reuses a number, whatever order it is given them in', () => {
    expect(nextVersion([{ version: 3 }, { version: 1 }, { version: 2 }])).toBe(4)
  })

  it('keeps counting up after a rollback republished older content', () => {
    // A rollback appends a new version holding old content, so the numbers
    // stay a history rather than a pointer.
    expect(nextVersion([{ version: 1 }, { version: 2 }, { version: 3 }])).toBe(4)
  })
})

describe('hasUnpublishedChanges', () => {
  it('is true for a flow that has never been published', () => {
    expect(hasUnpublishedChanges(snapshot(), null)).toBe(true)
  })

  it('is false when the draft matches what users see', () => {
    expect(hasUnpublishedChanges(snapshot(), snapshot())).toBe(false)
  })

  it('notices a renamed process', () => {
    expect(hasUnpublishedChanges(snapshot({ name: 'Order beans' }), snapshot())).toBe(true)
  })

  it('notices changed steps', () => {
    const edited = snapshot({ steps: [{ id: 's1', type: 'action', text: 'Click Basket' }] })
    expect(hasUnpublishedChanges(edited, snapshot())).toBe(true)
  })

  it('notices a step that was added or removed', () => {
    expect(hasUnpublishedChanges(snapshot({ steps: [] }), snapshot())).toBe(true)
  })

  it('notices changed targeting', () => {
    expect(hasUnpublishedChanges(snapshot({ urlPatterns: ['/orders'] }), snapshot())).toBe(true)
  })

  it('notices a description appearing', () => {
    expect(hasUnpublishedChanges(snapshot({ description: 'How to order' }), snapshot())).toBe(true)
  })

  it('is false for a flow edited and edited back', () => {
    const published = snapshot()
    const there = snapshot({ name: 'Something else' })
    const andBack = snapshot()

    expect(hasUnpublishedChanges(there, published)).toBe(true)
    expect(hasUnpublishedChanges(andBack, published)).toBe(false)
  })
})

describe('publishState', () => {
  it('reports a flow that has never been published', () => {
    expect(publishState(false, true)).toBe('never-published')
  })

  it('reports a flow whose draft matches the published version', () => {
    expect(publishState(true, false)).toBe('up-to-date')
  })

  it('reports a flow edited since it was published', () => {
    expect(publishState(true, true)).toBe('edited-since')
  })

  it('says users still see the old version, which is the part that surprises people', () => {
    expect(describePublishState('edited-since')).toContain('old version')
  })
})
