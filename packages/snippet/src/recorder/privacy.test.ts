/**
 * The rule in CLAUDE.md, proved end to end: a recording contains structure
 * and authored labels, never anything the user typed, chose or submitted.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { startRecording, type Recording } from './recorder'

let recording: Recording | null = null

const SECRET = 'alex.private@example.com'

function renderForm(): void {
  document.body.innerHTML = `
    <form class="form">
      <label>Email <input id="email" name="email" type="email"></label>
      <label>Password <input id="password" name="password" type="password"></label>
      <label>Note <textarea id="note"></textarea></label>
      <label>Plan
        <select id="plan" name="plan">
          <option>One bag / month</option>
          <option>Two bags / month</option>
        </select>
      </label>
      <label><input id="gift" type="checkbox"> Gift wrap</label>
      <button id="save" type="button">Save changes</button>
    </form>
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

describe('what a recording never contains', () => {
  it('leaves out what was typed into a text field', () => {
    renderForm()
    const email = document.getElementById('email') as HTMLInputElement
    email.value = SECRET

    recording = startRecording({ doc: document, view: window })
    click('email')
    const flow = recording.stop()
    recording = null

    expect(JSON.stringify(flow)).not.toContain(SECRET)
    const [step] = flow.steps
    if (step?.type !== 'action') throw new Error('expected an action step')
    expect(step.target.name).toBe('Email')
  })

  it('leaves out a password, and records the field by its label', () => {
    renderForm()
    const password = document.getElementById('password') as HTMLInputElement
    password.value = 'hunter2'

    recording = startRecording({ doc: document, view: window })
    click('password')
    const flow = recording.stop()
    recording = null

    expect(JSON.stringify(flow)).not.toContain('hunter2')
    expect(JSON.stringify(flow)).toContain('Password')
  })

  it('leaves out what was typed into a textarea', () => {
    renderForm()
    const note = document.getElementById('note') as HTMLTextAreaElement
    note.value = 'Leave it with my neighbour, code 1234'

    recording = startRecording({ doc: document, view: window })
    click('note')
    const flow = recording.stop()
    recording = null

    expect(JSON.stringify(flow)).not.toContain('neighbour')
    expect(JSON.stringify(flow)).not.toContain('1234')
  })

  it('leaves out which option was chosen in a dropdown', () => {
    renderForm()
    const plan = document.getElementById('plan') as HTMLSelectElement
    plan.value = 'Two bags / month'

    recording = startRecording({ doc: document, view: window })
    click('plan')
    const flow = recording.stop()
    recording = null

    expect(JSON.stringify(flow)).not.toContain('Two bags')
    expect(JSON.stringify(flow)).toContain('Plan')
  })

  it('leaves out whether a box was ticked', () => {
    renderForm()
    const gift = document.getElementById('gift') as HTMLInputElement
    gift.checked = true

    recording = startRecording({ doc: document, view: window })
    click('gift')
    const flow = recording.stop()
    recording = null

    expect(JSON.stringify(flow)).not.toContain('"checked"')
    expect(JSON.stringify(flow)).not.toContain('"value"')
  })

  it('never stores a field value under any key', () => {
    renderForm()
    for (const id of ['email', 'note']) {
      const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
      field.value = SECRET
    }

    recording = startRecording({ doc: document, view: window })
    click('email')
    click('note')
    click('save')
    const flow = recording.stop()
    recording = null

    expect(JSON.stringify(flow)).not.toContain(SECRET)
  })
})
