import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROGRESS_KEY, clearProgress, loadProgress, saveProgress } from './progress'

afterEach(() => {
  sessionStorage.clear()
})

/** A storage that throws on everything, like a locked-down browser. */
const brokenStorage = {
  getItem: () => {
    throw new Error('denied')
  },
  setItem: () => {
    throw new Error('denied')
  },
  removeItem: () => {
    throw new Error('denied')
  },
} as unknown as Storage

describe('remembering progress', () => {
  it('saves where the user is and reads it back', () => {
    saveProgress(sessionStorage, { flowId: 'change-grind', stepIndex: 2 })
    expect(loadProgress(sessionStorage)).toEqual({ flowId: 'change-grind', stepIndex: 2 })
  })

  it('has nothing to report on a fresh page', () => {
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('forgets on request', () => {
    saveProgress(sessionStorage, { flowId: 'change-grind', stepIndex: 2 })
    clearProgress(sessionStorage)
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('ignores anything that is not the shape we saved', () => {
    sessionStorage.setItem(PROGRESS_KEY, 'not json at all')
    expect(loadProgress(sessionStorage)).toBeNull()

    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ flowId: 'x' }))
    expect(loadProgress(sessionStorage)).toBeNull()

    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ flowId: 5, stepIndex: 'two' }))
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('ignores a step index that could not be real', () => {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ flowId: 'f', stepIndex: -3 }))
    expect(loadProgress(sessionStorage)).toBeNull()
  })

  it('never breaks the page when storage is unavailable', () => {
    expect(() => saveProgress(brokenStorage, { flowId: 'f', stepIndex: 0 })).not.toThrow()
    expect(loadProgress(brokenStorage)).toBeNull()
    expect(() => clearProgress(brokenStorage)).not.toThrow()
  })

  it('copes with a browser that has no storage at all', () => {
    expect(() => saveProgress(undefined, { flowId: 'f', stepIndex: 0 })).not.toThrow()
    expect(loadProgress(undefined)).toBeNull()
    expect(() => clearProgress(undefined)).not.toThrow()
  })

  it('keeps its data under one obvious key', () => {
    saveProgress(sessionStorage, { flowId: 'f', stepIndex: 1 })
    expect(PROGRESS_KEY).toContain('wendmark')
    expect(sessionStorage.getItem(PROGRESS_KEY)).not.toBeNull()
  })

  it('does not leave stale progress after a failed write', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('quota')
      }),
      removeItem: vi.fn(),
    } as unknown as Storage
    saveProgress(storage, { flowId: 'f', stepIndex: 1 })
    expect(loadProgress(storage)).toBeNull()
  })
})
