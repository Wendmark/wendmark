import { describe, expect, it } from 'vitest'
import { getRole } from './role'
import { render } from './test-utils'

describe('getRole', () => {
  it('reads an explicit role attribute', () => {
    const el = render('<div role="tab">Shipping</div>')
    expect(getRole(el)).toBe('tab')
  })

  it('returns null for elements with no role', () => {
    const el = render('<div>Shipping</div>')
    expect(getRole(el)).toBeNull()
  })

  it('uses the first token of a role fallback list', () => {
    const el = render('<div role="switch checkbox">Dark mode</div>')
    expect(getRole(el)).toBe('switch')
  })

  it('ignores surrounding whitespace and letter case', () => {
    const el = render('<div role=" Tab ">Shipping</div>')
    expect(getRole(el)).toBe('tab')
  })

  it('treats an empty role attribute as no role', () => {
    const el = render('<div role="">Shipping</div>')
    expect(getRole(el)).toBeNull()
  })

  it('returns null for role="none"', () => {
    const el = render('<div role="none">Layout only</div>')
    expect(getRole(el)).toBeNull()
  })

  it('returns null for role="presentation"', () => {
    const el = render('<div role="presentation">Layout only</div>')
    expect(getRole(el)).toBeNull()
  })

  describe('implicit roles', () => {
    it('gives a button its implicit role', () => {
      const el = render('<button>Save changes</button>')
      expect(getRole(el)).toBe('button')
    })

    it('gives a heading its implicit role', () => {
      const el = render('<h2>Shop</h2>')
      expect(getRole(el)).toBe('heading')
    })

    it('gives a list its implicit role', () => {
      const el = render('<ul><li>Kiambu AA</li></ul>')
      expect(getRole(el)).toBe('list')
    })

    it('gives a list item its implicit role', () => {
      const list = render('<ul><li>Kiambu AA</li></ul>')
      const item = list.firstElementChild
      if (!item) throw new Error('list has no item')
      expect(getRole(item)).toBe('listitem')
    })

    it('treats a link with href as a link', () => {
      const el = render('<a href="/orders">Orders</a>')
      expect(getRole(el)).toBe('link')
    })

    it('gives a link without href no role', () => {
      const el = render('<a>Orders</a>')
      expect(getRole(el)).toBeNull()
    })

    it('treats an image with alt text as an image', () => {
      const el = render('<img src="logo.png" alt="Fika logo">')
      expect(getRole(el)).toBe('img')
    })

    it('treats an image with empty alt as decorative', () => {
      const el = render('<img src="divider.png" alt="">')
      expect(getRole(el)).toBeNull()
    })

    it('treats a select as a combobox', () => {
      const el = render('<select><option>Whole bean</option></select>')
      expect(getRole(el)).toBe('combobox')
    })

    it('treats a multi-select as a listbox', () => {
      const el = render('<select multiple><option>Whole bean</option></select>')
      expect(getRole(el)).toBe('listbox')
    })
  })

  describe('explicit vs implicit', () => {
    it('lets an explicit role override the implicit one', () => {
      const el = render('<button role="tab">Shipping</button>')
      expect(getRole(el)).toBe('tab')
    })

    it('falls back to the implicit role when role is empty', () => {
      const el = render('<button role="">Save changes</button>')
      expect(getRole(el)).toBe('button')
    })
  })

  describe('input roles', () => {
    it.each([
      ['text', 'textbox'],
      ['email', 'textbox'],
      ['tel', 'textbox'],
      ['url', 'textbox'],
      ['search', 'searchbox'],
      ['checkbox', 'checkbox'],
      ['radio', 'radio'],
      ['button', 'button'],
      ['submit', 'button'],
      ['reset', 'button'],
      ['image', 'button'],
      ['range', 'slider'],
      ['number', 'spinbutton'],
      ['password', null],
      ['hidden', null],
      ['date', null],
      ['color', null],
      ['file', null],
    ])('gives <input type="%s"> the role %s', (type, role) => {
      const el = render(`<input type="${type}">`)
      expect(getRole(el)).toBe(role)
    })

    it('treats an input with no type as a textbox', () => {
      const el = render('<input>')
      expect(getRole(el)).toBe('textbox')
    })

    it('treats an input with an unknown type as a textbox', () => {
      const el = render('<input type="banana">')
      expect(getRole(el)).toBe('textbox')
    })
  })
})
