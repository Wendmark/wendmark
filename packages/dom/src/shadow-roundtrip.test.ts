/**
 * The point of all the shadow-DOM plumbing: can we describe an element
 * inside a web component, and find it again afterwards?
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { fingerprint } from './fingerprint'
import { findInteractiveTarget } from './interactive'
import { resolve } from './resolve'

/** A page whose Save button lives inside a component's shadow root. */
function renderApp(): { host: Element; button: Element; label: Element } {
  document.body.innerHTML = `
    <main>
      <h1>Profile</h1>
      <fika-form></fika-form>
    </main>
  `
  const host = document.querySelector('fika-form') as Element
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <div class="card">
      <button class="primary" data-testid="save-profile"><span>Save changes</span></button>
    </div>
  `
  return {
    host,
    button: shadow.querySelector('button') as Element,
    label: shadow.querySelector('span') as Element,
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('an element inside a web component', () => {
  it('climbs from the clicked text to the real control', () => {
    const { button, label } = renderApp()
    expect(findInteractiveTarget(label)).toBe(button)
  })

  it('is described with the route into its component', () => {
    const { button } = renderApp()
    const target = fingerprint(button)

    expect(target.shadowPath?.[0]).toBe('fika-form')
    expect(target.shadowPath?.length).toBe(2)
    expect(target.name).toBe('Save changes')
    expect(target.role).toBe('button')
  })

  it('is found again from that description', () => {
    const { button } = renderApp()
    const target = fingerprint(button)

    const result = resolve(target, document)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(button)
  })

  it('is found again after the component was rebuilt around it', () => {
    const { button } = renderApp()
    const target = fingerprint(button)

    // A new release: different classes, an extra wrapper, same button.
    const host = document.querySelector('fika-form') as Element
    const shadow = host.shadowRoot as ShadowRoot
    shadow.innerHTML = `
      <section class="c-card-2026"><div class="row">
        <button class="c-btn" data-testid="save-profile"><span>Save changes</span></button>
      </div></section>
    `
    const rebuilt = shadow.querySelector('button') as Element
    expect(rebuilt).not.toBe(button)

    const result = resolve(target, document)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(rebuilt)
  })

  it('is found in a component nested inside another component', () => {
    document.body.innerHTML = '<fika-app></fika-app>'
    const app = document.querySelector('fika-app') as Element
    const appRoot = app.attachShadow({ mode: 'open' })
    appRoot.innerHTML = '<fika-form></fika-form>'
    const form = appRoot.querySelector('fika-form') as Element
    form.attachShadow({ mode: 'open' }).innerHTML = '<button class="primary">Save changes</button>'
    const button = (form.shadowRoot as ShadowRoot).querySelector('button') as Element

    const target = fingerprint(button)
    expect(target.shadowPath).toEqual(['fika-app', 'fika-form', 'button.primary'])

    const result = resolve(target, document)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element).toBe(button)
  })

  it('is described without a shadow path when it lives in the page itself', () => {
    document.body.innerHTML = '<button id="save">Save changes</button>'
    const button = document.getElementById('save') as Element
    expect(fingerprint(button).shadowPath).toBeUndefined()
  })

  it('cannot reach into a closed component, and reports not-found rather than guessing', () => {
    document.body.innerHTML = '<secret-form></secret-form>'
    const host = document.querySelector('secret-form') as Element
    host.attachShadow({ mode: 'closed' }).innerHTML = '<button>Save changes</button>'

    const result = resolve(
      { selectors: ['button.primary'], role: 'button', name: 'Save changes' },
      document,
    )
    expect(result.status).toBe('not-found')
  })
})
