import { FlowSchema } from '@wendmark/core'
import { afterEach, describe, expect, it } from 'vitest'
import { startRecording, type Recording } from './recorder'

let recording: Recording | null = null

function renderForm(): void {
  document.body.innerHTML = `
    <form class="form">
      <label>Email <input id="email" name="email" type="email"></label>
      <label>Grind <select id="grind" name="grind"><option>Whole bean</option><option>Filter</option></select></label>
      <label><input id="gift" type="checkbox"> Gift wrap</label>
      <button id="save" type="button">Save changes</button>
    </form>
  `
}

function fillIn(id: string, value: string): void {
  const field = document.getElementById(id) as HTMLInputElement
  field.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  field.value = value
  field.dispatchEvent(new Event('change', { bubbles: true }))
}

afterEach(() => {
  recording?.stop()
  recording = null
  document.body.innerHTML = ''
})

describe('recording what the user fills in', () => {
  it('records typing as a step of its own', () => {
    renderForm()
    recording = startRecording({ doc: document, view: window })
    fillIn('email', 'alex@example.com')

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(1)
    const [step] = flow.steps
    expect(step?.type).toBe('input')
    expect(step?.text).toBe('Enter your Email')
  })

  it('still records nothing of what was typed', () => {
    renderForm()
    recording = startRecording({ doc: document, view: window })
    fillIn('email', 'alex@example.com')

    const flow = recording.stop()
    recording = null
    expect(JSON.stringify(flow)).not.toContain('alex@example.com')
  })

  it('does not leave a stray click step in front of it', () => {
    renderForm()
    recording = startRecording({ doc: document, view: window })
    fillIn('email', 'alex@example.com')
    fillIn('grind', 'Filter')

    const flow = recording.stop()
    recording = null
    expect(flow.steps.map((step) => step.type)).toEqual(['input', 'input'])
    expect(flow.steps.map((step) => step.id)).toEqual(['s1', 's2'])
  })

  it('words a dropdown as choosing, not typing', () => {
    renderForm()
    recording = startRecording({ doc: document, view: window })
    fillIn('grind', 'Filter')

    const flow = recording.stop()
    recording = null
    expect(flow.steps[0]?.text).toBe('Choose a Grind')
  })

  it('mixes filling in and clicking in the order they happened', () => {
    renderForm()
    recording = startRecording({ doc: document, view: window })
    fillIn('email', 'alex@example.com')
    document.getElementById('save')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const flow = recording.stop()
    recording = null
    expect(flow.steps.map((step) => step.type)).toEqual(['input', 'action'])
    expect(FlowSchema.safeParse(flow).success).toBe(true)
  })
})
