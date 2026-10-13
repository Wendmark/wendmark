import { ReportSchema } from '@wendmark/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { startProblemReport, type ProblemReport } from './report'

let report: ProblemReport | null = null

afterEach(() => {
  report?.cancel()
  report = null
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  localStorage.clear()
})

/** A page with a customer's own data on it. */
function renderPage(): void {
  document.body.innerHTML = `
    <main>
      <h2>Alex Lindqvist's orders</h2>
      <a id="order" href="/orders/10421">Order FK-10421</a>
      <label>Email <input id="email" name="email"></label>
      <button id="save" type="button">Save changes</button>
    </main>`
}

/** The fetch the report goes out through, answering as the portal does. */
function portal(): ReturnType<typeof vi.fn> {
  const stub = vi.fn(async () => Promise.resolve({ ok: true, status: 202 } as Response))
  vi.stubGlobal('fetch', stub)
  return stub
}

function start(labels: 'none' | 'all' = 'none', onEnd = vi.fn()) {
  report = startProblemReport({
    portalOrigin: 'https://portal.test',
    appKey: 'wm_key',
    labels,
    snippetVersion: '0.0.0',
    userRef: 'customer-7',
    onEnd,
  })
  return onEnd
}

/** Inside Wendmark's own shadow root, where the panel lives. */
function ours(selector: string): HTMLElement {
  for (const host of document.querySelectorAll(OVERLAY_TAG)) {
    const found = host.shadowRoot?.querySelector<HTMLElement>(selector)
    if (found) return found
  }
  throw new Error(`no ${selector} in Wendmark's panel`)
}

function button(text: string): HTMLButtonElement {
  for (const host of document.querySelectorAll(OVERLAY_TAG)) {
    for (const candidate of host.shadowRoot?.querySelectorAll('button') ?? []) {
      if (candidate.textContent === text) return candidate
    }
  }
  throw new Error(`no "${text}" button`)
}

function listed(): string[] {
  return [...ours('[data-wendmark="report"]').querySelectorAll('li')].map(
    (item) => item.textContent ?? '',
  )
}

function click(id: string): void {
  document.getElementById(id)?.click()
}

function typeNote(note: string): void {
  const field = ours('textarea') as HTMLTextAreaElement
  field.value = note
  field.dispatchEvent(new Event('input'))
}

function describeIt(note: string): void {
  button('Done').click()
  typeNote(note)
}

async function sentBody(stub: ReturnType<typeof vi.fn>): Promise<unknown> {
  await vi.waitFor(() => expect(stub).toHaveBeenCalled())
  const [, init] = stub.mock.calls[0] as unknown as [string, RequestInit]
  return JSON.parse(String(init.body))
}

describe('reporting a problem', () => {
  it('lists each control the person presses, masked before they see it', () => {
    renderPage()
    start('none')
    click('order')
    click('save')

    const items = listed()
    expect(items).toHaveLength(2)
    expect(items.join(' ')).not.toContain('FK-10421')
    expect(items.join(' ')).not.toContain('Lindqvist')
    expect(items[0]).toContain('Follow a link')
  })

  it('keeps the labels when the app has chosen to', () => {
    renderPage()
    start('all')
    click('save')
    expect(listed()[0]).toContain('Save changes')
  })

  it('never notes presses on its own panel', () => {
    renderPage()
    start()
    button('Cancel').focus()
    ours('header').click()
    expect(ours('[data-wendmark="report"]').querySelector('li')).toBeNull()
  })

  it('cannot be finished before anything has been noted', () => {
    renderPage()
    start()
    expect(button('Done').disabled).toBe(true)
    click('save')
    expect(button('Done').disabled).toBe(false)
  })

  it('lets the person leave a step out', () => {
    renderPage()
    start()
    click('order')
    click('save')
    ours('li button').click()
    expect(listed()).toHaveLength(1)
  })

  it('stops noting at Done: nothing after they stopped', () => {
    renderPage()
    start()
    click('save')
    button('Done').click()
    click('order')
    expect(listed()).toHaveLength(1)
  })

  it('needs a sentence before it can be sent', () => {
    renderPage()
    start()
    click('save')
    button('Done').click()
    expect(button('Send report').disabled).toBe(true)
    typeNote('Saving did nothing')
    expect(button('Send report').disabled).toBe(false)
  })

  it('sends a report the portal accepts, and thanks them', async () => {
    renderPage()
    const stub = portal()
    start()
    click('order')
    click('save')
    describeIt('Saving did nothing')
    button('Send report').click()

    const body = await sentBody(stub)
    const parsed = ReportSchema.safeParse(body)
    expect(parsed.success).toBe(true)
    expect(body).toMatchObject({
      note: 'Saving did nothing',
      labels: 'none',
      userRef: 'customer-7',
      snippetVersion: '0.0.0',
    })
    await vi.waitFor(() => expect(button('Close')).toBeTruthy())
  })

  it('sends paths without the records in them', async () => {
    renderPage()
    window.history.pushState(null, '', '/orders/10421')
    const stub = portal()
    start()
    click('save')
    describeIt('Saving did nothing')
    button('Send report').click()

    const body = (await sentBody(stub)) as { pages: string[] }
    expect(body.pages).toEqual(['/orders/*'])
    window.history.pushState(null, '', '/')
  })

  it('never sends what anyone typed', async () => {
    renderPage()
    const stub = portal()
    start('all')
    const email = document.getElementById('email') as HTMLInputElement
    email.click()
    email.value = 'alex@example.com'
    email.dispatchEvent(new Event('change', { bubbles: true }))
    describeIt('It will not take my email')
    button('Send report').click()

    expect(JSON.stringify(await sentBody(stub))).not.toContain('alex@example.com')
  })

  it('says so when it could not be sent, and can try again', async () => {
    renderPage()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    start()
    click('save')
    describeIt('Saving did nothing')
    button('Send report').click()

    await vi.waitFor(() =>
      expect(ours('[role="alert"]').textContent).toContain('could not be sent'),
    )
    expect(button('Send report').disabled).toBe(false)
  })

  it('closes without sending anything', () => {
    renderPage()
    const stub = portal()
    const onEnd = start()
    click('save')
    button('Cancel').click()

    expect(onEnd).toHaveBeenCalledOnce()
    expect(stub).not.toHaveBeenCalled()
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
    report = null
  })
})
