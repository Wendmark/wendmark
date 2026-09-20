/**
 * The question this whole package exists to answer: after a real app has
 * changed, does a fingerprint recorded earlier still find the right element?
 *
 * Each test fingerprints an element in Fika's Profile page, then resolves it
 * against a version of that page changed the way developers really change
 * pages.
 */
import { describe, expect, it } from 'vitest'
import { fingerprint } from './fingerprint'
import { resolve } from './resolve'
import { renderPick } from './test-utils'

/** Fika's Profile page, as it was when the flow was recorded. */
const ORIGINAL = `
  <section aria-labelledby="profile-heading">
    <h1 id="profile-heading">Profile</h1>
    <form class="form">
      <label>Name <input name="name"></label>
      <label>Email <input name="email" type="email"></label>
      <label>Delivery address <input name="address"></label>
      <label>Plan
        <select name="plan"><option>One bag / month</option><option>Two bags / month</option></select>
      </label>
      <button data-pick type="submit" class="btn">Save changes</button>
    </form>
  </section>
`

/** Fingerprint the Save button on the original page. */
function recordSaveButton() {
  return fingerprint(renderPick(ORIGINAL))
}

/** Render a changed page and try to find the recorded element again. */
function replay(target: ReturnType<typeof recordSaveButton>, markup: string) {
  document.body.innerHTML = markup
  return resolve(target, document)
}

describe('finding an element again after the page changed', () => {
  it('finds it on the unchanged page', () => {
    const target = recordSaveButton()
    const result = replay(target, ORIGINAL)
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.textContent).toBe('Save changes')
  })

  it('survives renamed classes and extra wrappers', () => {
    const target = recordSaveButton()
    const result = replay(
      target,
      `
      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading">Profile</h1>
        <div class="card-x1"><div class="inner-x2">
          <form class="c-form-2024">
            <label>Name <input name="name"></label>
            <div class="actions-x3">
              <button id="save-btn" type="submit" class="c-btn c-btn--primary">Save changes</button>
            </div>
          </form>
        </div></div>
      </section>
    `,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.id).toBe('save-btn')
  })

  it('survives the form being reordered', () => {
    const target = recordSaveButton()
    const result = replay(
      target,
      `
      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading">Profile</h1>
        <form class="form">
          <button id="save-btn" type="submit" class="btn">Save changes</button>
          <label>Email <input name="email" type="email"></label>
          <label>Name <input name="name"></label>
        </form>
      </section>
    `,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.id).toBe('save-btn')
  })

  it('survives a reworded label', () => {
    const target = recordSaveButton()
    const result = replay(
      target,
      `
      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading">Profile</h1>
        <form class="form">
          <button id="save-btn" type="submit" class="btn">Save changes now</button>
        </form>
      </section>
    `,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.id).toBe('save-btn')
  })

  it('tells two identical buttons apart by their section', () => {
    const target = recordSaveButton()
    const result = replay(
      target,
      `
      <section aria-labelledby="billing-heading">
        <h1 id="billing-heading">Billing</h1>
        <form class="form"><button id="billing-save" class="btn">Save changes</button></form>
      </section>
      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading">Profile</h1>
        <form class="form"><button id="profile-save" class="btn">Save changes</button></form>
      </section>
    `,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.id).toBe('profile-save')
  })

  it('says not-found when the element is gone', () => {
    const target = recordSaveButton()
    const result = replay(
      target,
      `
      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading">Profile</h1>
        <p>Your profile is read-only while your subscription is paused.</p>
      </section>
    `,
    )
    expect(result.status).toBe('not-found')
  })

  it('says not-found on a different page entirely', () => {
    const target = recordSaveButton()
    const result = replay(
      target,
      `
      <section aria-labelledby="shop-heading">
        <h1 id="shop-heading">Shop</h1>
        <ul class="grid"><li class="card"><button>Add to subscription</button></li></ul>
      </section>
    `,
    )
    expect(result.status).toBe('not-found')
  })

  it('finds a translated button by its test id', () => {
    const el = renderPick(
      '<form class="form"><button data-pick data-testid="save-profile" class="btn">Save changes</button></form>',
    )
    const target = fingerprint(el)
    const result = replay(
      target,
      '<form class="form"><button id="sv" data-testid="save-profile" class="btn">Spara ändringar</button></form>',
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.id).toBe('sv')
  })

  it('pins a list row by its position, not by which item it holds', () => {
    // A row in a list of identical rows can only be described by position, so
    // the fingerprint's selector says "the second one". If the data changes,
    // that is a different coffee. Steps like this must be marked `dynamic`,
    // and the player highlights the whole group instead of one row.
    const el = renderPick(`
      <ul class="list">
        <li class="card"><button>Choose</button></li>
        <li class="card"><button data-pick>Choose</button></li>
        <li class="card"><button>Choose</button></li>
      </ul>
    `)
    const target = fingerprint(el)
    expect(target.selectors[0]).toContain('nth-of-type(2)')

    const result = replay(
      target,
      `
      <ul class="list">
        <li class="card"><button>Choose</button></li>
        <li class="card"><button id="second">Choose</button></li>
        <li class="card"><button>Choose</button></li>
        <li class="card"><button>Choose</button></li>
      </ul>
    `,
    )
    expect(result.status).toBe('found')
    if (result.status === 'found') expect(result.element.id).toBe('second')
  })
})
