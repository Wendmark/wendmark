import { beforeEach, describe, expect, it } from 'vitest'
import { followShadowPath, isInShadow, parentAcrossShadow, queryAllDeep, rootOf } from './shadow'

/** A page with a web component whose shadow root holds a button. */
function renderComponent(): { host: Element; inner: Element } {
  document.body.innerHTML = '<fika-widget></fika-widget><button id="light">Light DOM</button>'
  const host = document.querySelector('fika-widget') as Element
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="wrap"><button class="primary">Save changes</button></div>'
  return { host, inner: shadow.querySelector('button') as Element }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('parentAcrossShadow', () => {
  it('steps out of a shadow root onto its host', () => {
    const { host, inner } = renderComponent()
    const wrap = inner.parentElement as Element
    expect(parentAcrossShadow(wrap)).toBe(host)
  })

  it('behaves normally inside one tree', () => {
    const { inner } = renderComponent()
    expect(parentAcrossShadow(inner)?.className).toBe('wrap')
  })

  it('stops at the top of the page', () => {
    renderComponent()
    expect(parentAcrossShadow(document.documentElement)).toBeNull()
  })
})

describe('rootOf and isInShadow', () => {
  it('knows an element inside a component from one in the page', () => {
    const { inner } = renderComponent()
    const light = document.getElementById('light') as Element

    expect(isInShadow(inner)).toBe(true)
    expect(isInShadow(light)).toBe(false)
    expect(rootOf(inner)).toBeInstanceOf(ShadowRoot)
    expect(rootOf(light)).toBe(document)
  })
})

describe('queryAllDeep', () => {
  it('finds elements the page itself cannot see', () => {
    renderComponent()
    expect(document.querySelectorAll('button.primary')).toHaveLength(0)
    expect(queryAllDeep(document, 'button.primary')).toHaveLength(1)
  })

  it('finds matches in the page and inside components together', () => {
    renderComponent()
    expect(queryAllDeep(document, 'button')).toHaveLength(2)
  })

  it('reaches components nested inside components', () => {
    document.body.innerHTML = '<outer-thing></outer-thing>'
    const outer = document.querySelector('outer-thing') as Element
    const outerRoot = outer.attachShadow({ mode: 'open' })
    outerRoot.innerHTML = '<inner-thing></inner-thing>'
    const inner = outerRoot.querySelector('inner-thing') as Element
    inner.attachShadow({ mode: 'open' }).innerHTML = '<button class="deep">Deep</button>'

    expect(queryAllDeep(document, 'button.deep')).toHaveLength(1)
  })

  it('cannot see into a closed shadow root, and says so by finding nothing', () => {
    document.body.innerHTML = '<secret-thing></secret-thing>'
    const host = document.querySelector('secret-thing') as Element
    host.attachShadow({ mode: 'closed' }).innerHTML = '<button>Hidden</button>'

    expect(queryAllDeep(document, 'button')).toHaveLength(0)
  })

  it('survives a selector the browser rejects', () => {
    renderComponent()
    expect(queryAllDeep(document, '>>> nonsense')).toEqual([])
  })
})

describe('followShadowPath', () => {
  it('walks into a component to reach an element', () => {
    const { inner } = renderComponent()
    expect(followShadowPath(['fika-widget', 'button.primary'], document)).toBe(inner)
  })

  it('returns nothing when a step of the path is missing', () => {
    renderComponent()
    expect(followShadowPath(['fika-widget', 'button.gone'], document)).toBeNull()
    expect(followShadowPath(['other-widget', 'button.primary'], document)).toBeNull()
  })

  it('returns nothing when something on the way has no shadow root', () => {
    renderComponent()
    expect(followShadowPath(['button#light', 'button.primary'], document)).toBeNull()
  })
})
