import { describe, expect, it } from 'vitest'
import { findInteractiveTarget } from './interactive'
import { byId, renderTarget } from './test-utils'

describe('findInteractiveTarget', () => {
  it('climbs from a span to the button around it', () => {
    const clicked = renderTarget('<button id="expected"><span id="target">Save</span></button>')
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('climbs several levels, e.g. from an icon inside a link', () => {
    const clicked = renderTarget(`
      <a id="expected" href="/orders">
        <span><svg><path id="target" d="M0 0h10v10z"></path></svg></span>
        Orders
      </a>
    `)
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('returns the clicked element when it is interactive itself', () => {
    const clicked = renderTarget('<button id="target">Save</button>')
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('treats form fields as interactive', () => {
    const clicked = renderTarget('<label>Email <input id="target" type="email"></label>')
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('recognises custom widgets by their role', () => {
    const clicked = renderTarget(
      '<div id="expected" role="tab"><span id="target">Shipping</span></div>',
    )
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('recognises elements made focusable with tabindex', () => {
    const clicked = renderTarget(
      '<div id="expected" tabindex="0"><span id="target">Card</span></div>',
    )
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('does not treat tabindex="-1" as interactive', () => {
    const clicked = renderTarget('<div tabindex="-1"><span id="target">Panel</span></div>')
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('returns the clicked element when nothing around it is interactive', () => {
    const clicked = renderTarget('<section><h2 id="target">My tastings</h2></section>')
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('climbs far enough for a card wrapped in a link', () => {
    const clicked = renderTarget(`
      <a id="expected" href="/coffee/kiambu">
        <div><div><div><div>
          <h3><span><strong id="target">Kiambu AA</strong></span></h3>
        </div></div></div></div>
      </a>
    `)
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('stops climbing after a limit', () => {
    const clicked = renderTarget(`
      <button>
        <div><div><div><div><div><div><div><div><div>
          <span id="target">Too deep</span>
        </div></div></div></div></div></div></div></div></div>
      </button>
    `)
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('never climbs past a section boundary', () => {
    const clicked = renderTarget(`
      <div tabindex="0">
        <section><p><span id="target">Freshly roasted</span></p></section>
      </div>
    `)
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('never climbs past a form boundary', () => {
    const clicked = renderTarget(`
      <div role="button">
        <form><label><span id="target">Email</span></label></form>
      </div>
    `)
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })

  it('still finds a control inside a boundary', () => {
    const clicked = renderTarget(`
      <form><button id="expected"><span id="target">Save</span></button></form>
    `)
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('recognises a clickable element by its pointer cursor', () => {
    const clicked = renderTarget(`
      <div id="expected" style="cursor: pointer"><span id="target">Open this order</span></div>
    `)
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('picks the card, not the text inside it, when both show a pointer', () => {
    // The cursor is inherited, so everything inside a clickable card looks
    // clickable. The outermost element with the pointer is the control.
    const clicked = renderTarget(`
      <div id="expected" style="cursor: pointer">
        <div style="cursor: pointer"><span id="target">FK-10421</span></div>
      </div>
    `)
    expect(findInteractiveTarget(clicked)).toBe(byId('expected'))
  })

  it('ignores a pointer cursor on plain text with no click behaviour nearby', () => {
    const clicked = renderTarget('<p><span id="target">Freshly roasted</span></p>')
    expect(findInteractiveTarget(clicked)).toBe(clicked)
  })
})
