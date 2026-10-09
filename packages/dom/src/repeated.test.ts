import { describe, expect, it } from 'vitest'
import { isInRepeatedStructure } from './repeated'
import { renderPick } from './test-utils'

describe('things that are the user’s own data', () => {
  it('a button inside a list item', () => {
    const el = renderPick(`
      <ul>
        <li><button data-pick>Add to subscription</button></li>
        <li><button>Add to subscription</button></li>
      </ul>
    `)
    expect(isInRepeatedStructure(el)).toBe(true)
  })

  it('a cell in a table row', () => {
    const el = renderPick(`
      <table>
        <tbody>
          <tr><td><a data-pick href="/orders/10421">FK-10421</a></td></tr>
          <tr><td><a href="/orders/10588">FK-10588</a></td></tr>
        </tbody>
      </table>
    `)
    expect(isInRepeatedStructure(el)).toBe(true)
  })

  it('an option in a listbox', () => {
    const el = renderPick(`
      <div role="listbox">
        <div role="option" data-pick>Kenya</div>
        <div role="option">Brazil</div>
      </div>
    `)
    expect(isInRepeatedStructure(el)).toBe(true)
  })

  it('a card in a grid of cards, which says nothing about itself', () => {
    // Fika's shop: plain divs, no roles, nothing but repetition to go on.
    const el = renderPick(`
      <div class="grid">
        <div class="card"><h3>Kiambu AA</h3><button data-pick>Add</button></div>
        <div class="card"><h3>Huila Castillo</h3><button>Add</button></div>
        <div class="card"><h3>Yirgacheffe</h3><button>Add</button></div>
        <div class="card"><h3>Cerrado Mineiro</h3><button>Add</button></div>
      </div>
    `)
    expect(isInRepeatedStructure(el)).toBe(true)
  })

  it('a row in a grid declared with roles', () => {
    const el = renderPick(`
      <div role="grid">
        <div role="row"><span data-pick>FK-10421</span></div>
        <div role="row"><span>FK-10588</span></div>
      </div>
    `)
    expect(isInRepeatedStructure(el)).toBe(true)
  })
})

describe('things that are fixed parts of an app', () => {
  it('a nav link, even though navs hold several links', () => {
    // Three sibling links, but the element clicked is the link itself, and
    // a navigation is not a list of the user's things.
    const el = renderPick(`
      <nav>
        <a href="/shop">Shop</a>
        <a href="/orders" data-pick>Orders</a>
        <a href="/profile">Profile</a>
      </nav>
    `)
    expect(isInRepeatedStructure(el)).toBe(false)
  })

  it('a submit button in a form', () => {
    const el = renderPick(`
      <form>
        <label>Name <input name="name" /></label>
        <label>Email <input name="email" /></label>
        <button data-pick type="submit">Save changes</button>
      </form>
    `)
    expect(isInRepeatedStructure(el)).toBe(false)
  })

  it('one of a pair of buttons', () => {
    // Two is a coincidence: Cancel beside Save is not a collection.
    const el = renderPick(`
      <div class="actions">
        <button class="secondary">Cancel</button>
        <button class="secondary" data-pick>Save</button>
      </div>
    `)
    expect(isInRepeatedStructure(el)).toBe(false)
  })

  it('a field in a settings form, however many fields there are', () => {
    const el = renderPick(`
      <form>
        <div class="field"><label>Name</label><input /></div>
        <div class="field"><label>Email</label><input data-pick /></div>
        <div class="field"><label>Address</label><input /></div>
        <div class="field"><label>Plan</label><input /></div>
      </form>
    `)
    // A form's fields repeat in shape but each one means something
    // different, and the user's own copy has the same fields.
    expect(isInRepeatedStructure(el)).toBe(false)
  })

  it('a lone button', () => {
    const el = renderPick(`<div><button data-pick>Record</button></div>`)
    expect(isInRepeatedStructure(el)).toBe(false)
  })
})

describe('how far it looks', () => {
  it('gives up rather than climbing the whole document', () => {
    const deep = Array.from({ length: 12 }, () => '<div>').join('')
    const close = '</div>'.repeat(12)
    const el = renderPick(`
      <ul>
        <li>${deep}<button data-pick>Deep inside an item</button>${close}</li>
        <li>other</li>
      </ul>
    `)
    // Twelve levels is further than anything real, and further than this
    // looks: better to miss than to call half a page a list.
    expect(isInRepeatedStructure(el)).toBe(false)
  })
})
