import { TargetSchema } from '@wendmark/core'
import { describe, expect, it } from 'vitest'
import { fingerprint } from './fingerprint'
import { renderPick } from './test-utils'

describe('fingerprint', () => {
  it('describes a button with every clue it can find', () => {
    const el = renderPick(`
      <section>
        <h2>Delivery address</h2>
        <form>
          <button data-pick data-testid="save-profile" class="btn">Save changes</button>
        </form>
      </section>
    `)
    expect(fingerprint(el)).toMatchObject({
      role: 'button',
      name: 'Save changes',
      text: 'Save changes',
      testId: 'save-profile',
      context: 'Delivery address',
    })
  })

  it('always produces a Target the schema accepts', () => {
    const el = renderPick('<a data-pick href="/orders">Orders</a>')
    expect(TargetSchema.safeParse(fingerprint(el)).success).toBe(true)
  })

  it('leaves out clues the element does not have', () => {
    const el = renderPick('<div data-pick></div>')
    const target = fingerprint(el)
    expect(Object.keys(target)).toEqual(['selectors'])
    expect(TargetSchema.safeParse(target).success).toBe(true)
  })

  it('names a field by its label and never by its value', () => {
    const el = renderPick('<label>Email <input data-pick value="alex@example.com"></label>')
    const target = fingerprint(el)
    expect(target.name).toBe('Email')
    expect(JSON.stringify(target)).not.toContain('alex@example.com')
  })

  it('cuts long text to the schema limit', () => {
    const el = renderPick(`<button data-pick>${'very long caption '.repeat(40)}</button>`)
    const target = fingerprint(el)
    expect(target.text?.length).toBeLessThanOrEqual(200)
    expect(TargetSchema.safeParse(target).success).toBe(true)
  })

  it('produces selectors that find the element again', () => {
    const el = renderPick(`
      <ul><li><button>Add</button></li><li><button data-pick>Add</button></li></ul>
    `)
    const [first] = fingerprint(el).selectors
    expect(first).toBeDefined()
    expect(document.querySelector(first as string)).toBe(el)
  })
})
