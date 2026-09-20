import { describe, expect, it } from 'vitest'
import { getTestId } from './test-id'
import { renderTarget } from './test-utils'

describe('getTestId', () => {
  it.each(['data-testid', 'data-test-id', 'data-test', 'data-qa', 'data-cy', 'data-automation-id'])(
    'reads %s',
    (attribute) => {
      const el = renderTarget(`<button id="target" ${attribute}="save-profile">Save</button>`)
      expect(getTestId(el)).toEqual({ attribute, value: 'save-profile' })
    },
  )

  it('returns null when the element has none', () => {
    const el = renderTarget('<button id="target">Save</button>')
    expect(getTestId(el)).toBeNull()
  })

  it('prefers data-testid over the other attributes', () => {
    const el = renderTarget(
      '<button id="target" data-cy="cypress" data-testid="save">Save</button>',
    )
    expect(getTestId(el)).toEqual({ attribute: 'data-testid', value: 'save' })
  })

  it('trims whitespace around the value', () => {
    const el = renderTarget('<button id="target" data-testid="  save  ">Save</button>')
    expect(getTestId(el)).toEqual({ attribute: 'data-testid', value: 'save' })
  })

  it('ignores an empty value', () => {
    const el = renderTarget('<button id="target" data-testid="   ">Save</button>')
    expect(getTestId(el)).toBeNull()
  })

  it('ignores an implausibly long value', () => {
    const el = renderTarget(`<button id="target" data-testid="${'x'.repeat(200)}">Save</button>`)
    expect(getTestId(el)).toBeNull()
  })
})
