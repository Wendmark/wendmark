import { describe, expect, it } from 'vitest'
import { describeLabels, headline, pageTrail, readSteps, replayStart, viewStep } from './view'

const pressed = {
  type: 'action',
  id: 's1',
  text: 'Press a button',
  dynamic: false,
  target: { selectors: ['button.save'], role: 'button', url: '/settings' },
}

describe('reading a stored report', () => {
  it('reads the steps it was given', () => {
    const [step] = readSteps([pressed])
    expect(viewStep(step ?? null)).toEqual({
      text: 'Press a button',
      role: 'button',
      page: '/settings',
      ownData: false,
      selectors: ['button.save'],
    })
  })

  it('says so about a step it cannot read, instead of failing', () => {
    const steps = readSteps([pressed, { type: 'teleport' }])
    expect(steps[1]).toBeNull()
    expect(viewStep(steps[1] ?? null).text).toBe('A step this portal cannot read')
  })

  it('reads nothing from something that is not a list', () => {
    expect(readSteps({ steps: [] })).toEqual([])
  })

  it('marks a step that pointed at the user’s own data', () => {
    const [step] = readSteps([{ ...pressed, dynamic: true }])
    expect(viewStep(step ?? null).ownData).toBe(true)
  })

  it('shows a note between steps as what it says', () => {
    const [step] = readSteps([{ type: 'instruction', id: 's2', text: 'Something to read' }])
    expect(viewStep(step ?? null)).toMatchObject({ text: 'Something to read', page: null })
  })
})

describe('summing a report up', () => {
  it('lists the pages in the order they were visited', () => {
    expect(pageTrail(['/', '/orders/*'])).toBe('/ → /orders/*')
    expect(pageTrail([])).toBe('—')
  })

  it('keeps the first line of a note, cut short for a list', () => {
    expect(headline('Saving does nothing.\nI tried twice.')).toBe('Saving does nothing.')
    expect(headline('x'.repeat(200), 10)).toBe(`${'x'.repeat(9)}…`)
  })

  it('says what the label policy meant for this report', () => {
    expect(describeLabels('none')).toContain('taken out')
    expect(describeLabels('all')).toContain('as they were')
  })
})

describe('where a replay starts', () => {
  const app = ['https://app.example.com', 'https://staging.example.com']

  it('opens the address the report came from, on its first page', () => {
    const start = replayStart(
      { origin: 'https://staging.example.com', pages: ['/subscription', '/billing'] },
      app,
    )
    expect(start).toEqual({
      origins: ['https://staging.example.com', 'https://app.example.com'],
      path: '/subscription',
    })
  })

  it('falls back to the app’s addresses when the report’s is no longer one of them', () => {
    const start = replayStart({ origin: 'https://old.example.com', pages: [] }, app)
    expect(start.origins).toEqual(app)
    expect(start.path).toBe('/')
  })

  it('starts at the root when the first page had an identifier masked out', () => {
    const start = replayStart({ origin: 'https://app.example.com', pages: ['/orders/*'] }, app)
    expect(start.path).toBe('/')
  })
})
