import { describe, expect, it } from 'vitest'
import type { Step } from '@wendmark/core'
import { addNote, moveStep, removeStep, retitleStep, setDynamic } from './edit'

function action(id: string, text = `Step ${id}`): Step {
  return {
    id,
    type: 'action',
    text,
    dynamic: false,
    target: { selectors: [`#${id}`], role: 'button', name: text },
  }
}

const three = [action('s1', 'Open the cart'), action('s2', 'Pick a coffee'), action('s3', 'Pay')]

const ids = (steps: Step[]): string[] => steps.map((step) => step.id)
const texts = (steps: Step[]): string[] => steps.map((step) => step.text)

describe('retitleStep', () => {
  it('rewrites what a step says', () => {
    expect(texts(retitleStep(three, 's2', 'Choose your coffee'))[1]).toBe('Choose your coffee')
  })

  it('trims what the author typed', () => {
    expect(texts(retitleStep(three, 's1', '  Open the cart  '))[0]).toBe('Open the cart')
  })

  it('leaves a step alone rather than letting it say nothing', () => {
    expect(texts(retitleStep(three, 's1', '   '))).toEqual(texts(three))
  })

  it('does not touch what the step points at', () => {
    const before = three[0]
    const edited = retitleStep(three, 's1', 'Something else')[0]

    const target = before?.type === 'action' ? before.target : null
    expect(edited).toHaveProperty('target', target)
  })

  it('ignores a step that is not there', () => {
    expect(retitleStep(three, 'nope', 'x')).toEqual(three)
  })
})

describe('moveStep', () => {
  it('moves a step up', () => {
    expect(texts(moveStep(three, 's2', -1))[0]).toBe('Pick a coffee')
  })

  it('moves a step down', () => {
    expect(texts(moveStep(three, 's1', 1))[1]).toBe('Open the cart')
  })

  it('renumbers so the ids follow the order', () => {
    expect(ids(moveStep(three, 's3', -1))).toEqual(['s1', 's2', 's3'])
    expect(texts(moveStep(three, 's3', -1))).toEqual(['Open the cart', 'Pay', 'Pick a coffee'])
  })

  it('does nothing at either end', () => {
    expect(moveStep(three, 's1', -1)).toEqual(three)
    expect(moveStep(three, 's3', 1)).toEqual(three)
  })

  it('ignores a step that is not there', () => {
    expect(moveStep(three, 'nope', 1)).toEqual(three)
  })
})

describe('removeStep', () => {
  it('drops a misclick', () => {
    expect(texts(removeStep(three, 's2'))).toEqual(['Open the cart', 'Pay'])
  })

  it('renumbers what is left', () => {
    expect(ids(removeStep(three, 's1'))).toEqual(['s1', 's2'])
  })

  it('keeps the last step, since a process with none is not a process', () => {
    const one = [action('s1')]
    expect(removeStep(one, 's1')).toEqual(one)
  })

  it('ignores a step that is not there', () => {
    expect(removeStep(three, 'nope')).toEqual(three)
  })
})

describe('setDynamic', () => {
  it('marks a step as the user’s own data', () => {
    expect(setDynamic(three, 's2', true)[1]).toHaveProperty('dynamic', true)
  })

  it('turns it off again', () => {
    const on = setDynamic(three, 's2', true)
    expect(setDynamic(on, 's2', false)[1]).toHaveProperty('dynamic', false)
  })

  it('means nothing for a step that points at no element', () => {
    const withNote = addNote(three, 'Have your card ready', 's1')
    const noted = withNote.find((step) => step.type === 'instruction')

    const after = setDynamic(withNote, noted?.id ?? '', true)
    expect(after.find((step) => step.type === 'instruction')).not.toHaveProperty('dynamic')
  })
})

describe('addNote', () => {
  it('adds something to read after a given step', () => {
    const edited = addNote(three, 'Have your card ready', 's1')
    expect(texts(edited)).toEqual(['Open the cart', 'Have your card ready', 'Pick a coffee', 'Pay'])
  })

  it('adds it at the end when no step was named', () => {
    expect(texts(addNote(three, 'All done', null)).at(-1)).toBe('All done')
  })

  it('makes an instruction, which points at nothing', () => {
    const note = addNote(three, 'Read this', 's1')[1]
    expect(note?.type).toBe('instruction')
    expect(note).not.toHaveProperty('target')
  })

  it('renumbers so the new step has a place in the order', () => {
    expect(ids(addNote(three, 'Read this', 's1'))).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('adds nothing when there is nothing to say', () => {
    expect(addNote(three, '   ', 's1')).toEqual(three)
  })

  it('adds at the end when the named step is gone', () => {
    expect(texts(addNote(three, 'Read this', 'nope')).at(-1)).toBe('Read this')
  })
})
