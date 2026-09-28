/** Recording and playing a process inside a web component. */
import { afterEach, describe, expect, it } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { setRect } from '../test-utils'
import { start, stop } from '../index'
import { startRecording, type Recording } from './recorder'

let recording: Recording | null = null

/** A page whose form lives inside a component's shadow root. */
function renderApp(): { button: Element; label: Element; field: Element } {
  document.body.innerHTML = '<fika-form></fika-form>'
  const host = document.querySelector('fika-form') as Element
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <div class="card">
      <label>Email <input class="email" type="email"></label>
      <button class="primary"><span class="label">Save changes</span></button>
    </div>
  `
  const button = shadow.querySelector('button') as Element
  const field = shadow.querySelector('input') as Element
  for (const element of [button, field]) {
    setRect(element, { left: 10, top: 10, width: 200, height: 30 })
  }
  return { button, label: shadow.querySelector('span') as Element, field }
}

/** A click as the browser reports it from inside a component. */
function clickInComponent(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

afterEach(() => {
  recording?.stop()
  recording = null
  stop()
  document.body.innerHTML = ''
})

describe('a process inside a web component', () => {
  it('records the button, not the component wrapping it', () => {
    const { label } = renderApp()
    recording = startRecording({ doc: document, view: window })
    clickInComponent(label)

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(1)
    const [step] = flow.steps
    if (step?.type !== 'action') throw new Error('expected an action step')
    expect(step.target.name).toBe('Save changes')
    expect(step.target.shadowPath?.[0]).toBe('fika-form')
  })

  it('records filling in a field inside a component', () => {
    const { field } = renderApp()
    recording = startRecording({ doc: document, view: window })
    field.dispatchEvent(new Event('change', { bubbles: true, composed: true }))

    const flow = recording.stop()
    recording = null
    expect(flow.steps[0]?.type).toBe('input')
    expect(flow.steps[0]?.text).toBe('Enter your Email')
  })

  it('plays back what it recorded', () => {
    const { button, label } = renderApp()
    recording = startRecording({ doc: document, view: window })
    clickInComponent(label)
    const flow = recording.stop()
    recording = null

    start(flow)
    const root = document.querySelector(OVERLAY_TAG)?.shadowRoot
    const ring = root?.querySelector('[data-wendmark="ring"]') as HTMLElement
    expect(ring.style.display).toBe('block')
    expect(root?.querySelector('[aria-current="step"]')?.lastElementChild?.textContent).toBe(
      'Click Save changes',
    )

    // The user clicks it themselves, inside the component.
    clickInComponent(button)
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })
})
