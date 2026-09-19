import { describe, expect, it } from 'vitest'
import { getAccessibleName } from './name'
import { renderTarget } from './test-utils'

describe('getAccessibleName', () => {
  it('returns null for an element with no name', () => {
    const el = renderTarget('<div id="target"></div>')
    expect(getAccessibleName(el)).toBeNull()
  })

  describe('aria-label', () => {
    it('uses aria-label', () => {
      const el = renderTarget('<button id="target" aria-label="Close">×</button>')
      expect(getAccessibleName(el)).toBe('Close')
    })

    it('trims and collapses whitespace', () => {
      const el = renderTarget('<button id="target" aria-label="  Close \n dialog ">×</button>')
      expect(getAccessibleName(el)).toBe('Close dialog')
    })

    it('ignores an empty aria-label', () => {
      const el = renderTarget('<div id="target" aria-label="   "></div>')
      expect(getAccessibleName(el)).toBeNull()
    })
  })

  describe('aria-labelledby', () => {
    it('uses the text of the referenced element', () => {
      const el = renderTarget(`
        <h2 id="heading">Delivery address</h2>
        <section id="target" aria-labelledby="heading"></section>
      `)
      expect(getAccessibleName(el)).toBe('Delivery address')
    })

    it('joins several referenced elements in order', () => {
      const el = renderTarget(`
        <span id="first">Delivery</span>
        <span id="second">address</span>
        <section id="target" aria-labelledby="second first"></section>
      `)
      expect(getAccessibleName(el)).toBe('address Delivery')
    })

    it('wins over aria-label', () => {
      const el = renderTarget(`
        <h2 id="heading">Delivery address</h2>
        <section id="target" aria-labelledby="heading" aria-label="Address"></section>
      `)
      expect(getAccessibleName(el)).toBe('Delivery address')
    })

    it('falls back to aria-label when the referenced ids do not exist', () => {
      const el = renderTarget(
        '<section id="target" aria-labelledby="missing" aria-label="Address"></section>',
      )
      expect(getAccessibleName(el)).toBe('Address')
    })
  })
  describe('form field labels', () => {
    it('uses a <label for> that points at the field', () => {
      const el = renderTarget(`
        <label for="target">Email</label>
        <input id="target" type="email">
      `)
      expect(getAccessibleName(el)).toBe('Email')
    })

    it('uses a <label> wrapped around the field', () => {
      const el = renderTarget('<label>Delivery address <input id="target"></label>')
      expect(getAccessibleName(el)).toBe('Delivery address')
    })

    it('joins several labels in order', () => {
      const el = renderTarget(`
        <label for="target">Email</label>
        <label for="target">(required)</label>
        <input id="target" type="email">
      `)
      expect(getAccessibleName(el)).toBe('Email (required)')
    })

    it('leaves the options of a wrapped select out of the name', () => {
      const el = renderTarget(`
        <label>
          Plan
          <select id="target">
            <option>One bag / month</option>
            <option>Two bags / month</option>
          </select>
        </label>
      `)
      expect(getAccessibleName(el)).toBe('Plan')
    })

    it('lets aria-label win over a <label>', () => {
      const el = renderTarget(`
        <label for="target">Email</label>
        <input id="target" type="email" aria-label="Work email">
      `)
      expect(getAccessibleName(el)).toBe('Work email')
    })
  })

  describe('never reads what the user typed', () => {
    it('does not use the value of a text field', () => {
      const el = renderTarget('<input id="target" value="alex@example.com">')
      expect(getAccessibleName(el)).toBeNull()
    })

    it('does not use a value typed after the page loaded', () => {
      const el = renderTarget('<input id="target">')
      if (!(el instanceof HTMLInputElement)) throw new Error('expected an input')
      el.value = 'my secret note'
      expect(getAccessibleName(el)).toBeNull()
    })

    it("does not put a wrapped textarea's text into the label", () => {
      const el = renderTarget(`
        <label>Note <textarea id="target">Leave it with the neighbour</textarea></label>
      `)
      expect(getAccessibleName(el)).toBe('Note')
    })
  })

  describe('buttons and images', () => {
    it('uses the authored caption of a submit input', () => {
      const el = renderTarget('<input id="target" type="submit" value="Save changes">')
      expect(getAccessibleName(el)).toBe('Save changes')
    })

    it('uses the alt text of an image', () => {
      const el = renderTarget('<img id="target" src="logo.png" alt="Fika logo">')
      expect(getAccessibleName(el)).toBe('Fika logo')
    })

    it('gives a decorative image no name', () => {
      const el = renderTarget('<img id="target" src="divider.png" alt="">')
      expect(getAccessibleName(el)).toBeNull()
    })
  })

  describe("the element's own text", () => {
    it('names a button by its text', () => {
      const el = renderTarget('<button id="target">Add to subscription</button>')
      expect(getAccessibleName(el)).toBe('Add to subscription')
    })

    it('names a link by its text', () => {
      const el = renderTarget('<a id="target" href="/orders">Orders</a>')
      expect(getAccessibleName(el)).toBe('Orders')
    })

    it('names a heading by its text', () => {
      const el = renderTarget('<h1 id="target">My tastings</h1>')
      expect(getAccessibleName(el)).toBe('My tastings')
    })

    it('includes text from nested elements', () => {
      const el = renderTarget('<button id="target">Save <strong>changes</strong></button>')
      expect(getAccessibleName(el)).toBe('Save changes')
    })

    it('does not name a plain container by its text', () => {
      const el = renderTarget('<div id="target">Freshly roasted, delivered to your door.</div>')
      expect(getAccessibleName(el)).toBeNull()
    })

    it('lets aria-label win over the text', () => {
      const el = renderTarget('<button id="target" aria-label="Close">×</button>')
      expect(getAccessibleName(el)).toBe('Close')
    })
  })

  describe('last resorts', () => {
    it('uses title when there is nothing else', () => {
      const el = renderTarget('<button id="target" title="Close"></button>')
      expect(getAccessibleName(el)).toBe('Close')
    })

    it('uses placeholder for an unlabelled field', () => {
      const el = renderTarget('<input id="target" placeholder="Search coffees">')
      expect(getAccessibleName(el)).toBe('Search coffees')
    })

    it('prefers a <label> over the placeholder', () => {
      const el = renderTarget(`
        <label for="target">Search</label>
        <input id="target" placeholder="e.g. Kiambu">
      `)
      expect(getAccessibleName(el)).toBe('Search')
    })

    it('prefers the text over title', () => {
      const el = renderTarget('<button id="target" title="Save your profile">Save</button>')
      expect(getAccessibleName(el)).toBe('Save')
    })

    it('skips an empty <label> and falls through to the placeholder', () => {
      const el = renderTarget(`
        <label for="target">   </label>
        <input id="target" placeholder="Search coffees">
      `)
      expect(getAccessibleName(el)).toBe('Search coffees')
    })

    it('skips an empty aria-label and falls through to the text', () => {
      const el = renderTarget('<button id="target" aria-label="">Save changes</button>')
      expect(getAccessibleName(el)).toBe('Save changes')
    })
  })
})
