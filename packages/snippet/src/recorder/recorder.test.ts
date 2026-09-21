import { FlowSchema } from '@wendmark/core'
import { afterEach, describe, expect, it } from 'vitest'
import { startRecording, type Recording } from './recorder'

let recording: Recording | null = null

function renderPage(): void {
  document.body.innerHTML = `
    <nav><a id="orders-link" href="/orders">Orders</a></nav>
    <form class="form">
      <label>Email <input id="email" name="email" type="email"></label>
      <label>Grind <select id="grind" name="grind"><option>Whole bean</option></select></label>
      <button id="save" type="button"><span id="save-label">Save changes</span></button>
    </form>
    <p id="prose">Freshly roasted, delivered to your door.</p>
  `
}

function click(id: string): void {
  document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

afterEach(() => {
  recording?.stop()
  recording = null
  document.body.innerHTML = ''
})

describe('recording a process', () => {
  it('turns a click into a step', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(1)
    const [step] = flow.steps
    if (step?.type !== 'action') throw new Error('expected an action step')
    expect(step.target.name).toBe('Save changes')
    expect(step.target.role).toBe('button')
  })

  it('records the control, not the text inside it', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save-label')

    const flow = recording.stop()
    recording = null
    const [step] = flow.steps
    if (step?.type !== 'action') throw new Error('expected an action step')
    expect(step.target.role).toBe('button')
    expect(step.target.selectors.join(' ')).toContain('save')
  })

  it('notes which page each step happened on', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')

    const flow = recording.stop()
    recording = null
    const [step] = flow.steps
    if (step?.type !== 'action') throw new Error('expected an action step')
    expect(step.target.url).toBe(location.href)
  })

  it('writes an instruction a person can read', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('orders-link')
    click('email')
    click('grind')
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.steps.map((step) => step.text)).toEqual([
      'Go to Orders',
      'Click the Email field',
      'Choose a Grind',
      'Click Save changes',
    ])
  })

  it('keeps the steps in the order they happened', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('orders-link')
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.steps.map((step) => step.id)).toEqual(['s1', 's2'])
  })

  it('produces a flow the player can be given straight away', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')

    const flow = recording.stop()
    recording = null
    expect(FlowSchema.safeParse(flow).success).toBe(true)
  })

  it('can be given a name', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window, name: 'Change your grind' })
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.name).toBe('Change your grind')
  })

  it('stops listening once it is stopped', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')
    const flow = recording.stop()
    recording = null

    click('orders-link')
    expect(flow.steps).toHaveLength(1)
  })

  it('records nothing when the user clicks nothing useful', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('prose')

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(0)
  })
})
