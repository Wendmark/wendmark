import type { ActionStep, Step } from '@wendmark/core'
import { describe, expect, it } from 'vitest'
import {
  addNote,
  addStep,
  canSave,
  emptyDraft,
  moveStep,
  removeStep,
  renameDraft,
  retitleStep,
  setDynamic,
  toFlow,
} from './draft'

function action(text: string): ActionStep {
  return {
    type: 'action',
    id: 'pending',
    text,
    dynamic: false,
    target: { selectors: ['button'], role: 'button', name: text },
  }
}

function draftOf(...texts: string[]) {
  return texts.reduce((draft, text) => addStep(draft, action(text)), emptyDraft('Process'))
}

describe('a draft as it is recorded', () => {
  it('starts empty and not worth saving', () => {
    const draft = emptyDraft()
    expect(draft.steps).toEqual([])
    expect(canSave(draft)).toBe(false)
  })

  it('numbers steps in the order they happened', () => {
    const draft = draftOf('One', 'Two', 'Three')
    expect(draft.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3'])
  })

  it('is worth saving once something has been recorded', () => {
    expect(canSave(draftOf('One'))).toBe(true)
  })
})

describe('tidying up a recording', () => {
  it('drops a misclick and renumbers what is left', () => {
    const draft = removeStep(draftOf('One', 'Misclick', 'Three'), 's2')
    expect(draft.steps.map((step) => step.text)).toEqual(['One', 'Three'])
    expect(draft.steps.map((step) => step.id)).toEqual(['s1', 's2'])
  })

  it('rewrites what a step tells the user', () => {
    const draft = retitleStep(draftOf('Click thing'), 's1', '  Open your Profile  ')
    expect(draft.steps[0]?.text).toBe('Open your Profile')
  })

  it('refuses to blank out a step', () => {
    const draft = draftOf('Click Save')
    expect(retitleStep(draft, 's1', '   ')).toEqual(draft)
  })

  it('moves a step, keeping the numbering tidy', () => {
    const draft = moveStep(draftOf('One', 'Two', 'Three'), 's3', -1)
    expect(draft.steps.map((step) => step.text)).toEqual(['One', 'Three', 'Two'])
    expect(draft.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3'])
  })

  it('does nothing when a step cannot move further', () => {
    const draft = draftOf('One', 'Two')
    expect(moveStep(draft, 's1', -1)).toEqual(draft)
    expect(moveStep(draft, 's2', 1)).toEqual(draft)
  })

  it('ignores a step that is not there', () => {
    const draft = draftOf('One')
    expect(removeStep(draft, 's9')).toEqual(draft)
    expect(moveStep(draft, 's9', 1)).toEqual(draft)
  })
})

describe('marking a step as the user’s own data', () => {
  it('marks an action step', () => {
    const draft = setDynamic(draftOf('Choose a coffee'), 's1', true)
    const [step] = draft.steps
    expect(step?.type === 'action' && step.dynamic).toBe(true)
  })

  it('leaves a note step alone, since it points at nothing', () => {
    const draft = addNote(emptyDraft(), 'Read this')
    expect(setDynamic(draft, 's1', true)).toEqual(draft)
  })
})

describe('notes and naming', () => {
  it('adds a note step for something to read', () => {
    const draft = addNote(draftOf('One'), 'Your bag ships on Monday.')
    expect(draft.steps[1]).toMatchObject({ type: 'instruction', text: 'Your bag ships on Monday.' })
  })

  it('ignores an empty note', () => {
    const draft = draftOf('One')
    expect(addNote(draft, '   ')).toEqual(draft)
  })

  it('renames the process', () => {
    expect(renameDraft(emptyDraft(), '  Change your grind ').name).toBe('Change your grind')
  })

  it('refuses a blank name', () => {
    const draft = emptyDraft('Process')
    expect(renameDraft(draft, '  ')).toEqual(draft)
  })
})

describe('toFlow', () => {
  it('produces something the player can run', () => {
    const flow = toFlow(draftOf('One', 'Two'), 'draft-1')
    expect(flow).toMatchObject({ schemaVersion: 1, id: 'draft-1', name: 'Process' })
    expect(flow.steps).toHaveLength(2)
  })

  it('keeps the steps as recorded', () => {
    const steps: Step[] = toFlow(draftOf('Click Save'), 'draft-1').steps
    expect(steps[0]).toMatchObject({ type: 'action', text: 'Click Save' })
  })
})
