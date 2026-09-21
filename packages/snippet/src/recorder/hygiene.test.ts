import { afterEach, describe, expect, it } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { startRecording, type Recording } from './recorder'

let recording: Recording | null = null

function renderPage(): void {
  document.body.innerHTML = `
    <button id="save" type="button">Save changes</button>
    <button id="cancel" type="button">Cancel</button>
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

describe('keeping a recording readable', () => {
  it('does not record the same click twice in a row', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')
    click('save')
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(1)
  })

  it('records the same element again when something happened in between', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')
    click('cancel')
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(3)
  })

  it('ignores clicks on Wendmark itself', () => {
    renderPage()
    const host = document.createElement(OVERLAY_TAG)
    const root = host.attachShadow({ mode: 'open' })
    const ourButton = document.createElement('button')
    ourButton.textContent = 'Stop'
    root.appendChild(ourButton)
    document.body.appendChild(host)

    recording = startRecording({ doc: document, view: window })
    ourButton.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    click('save')

    const flow = recording.stop()
    recording = null
    expect(flow.steps).toHaveLength(1)
    expect(JSON.stringify(flow)).not.toContain('Stop')
  })

  it('numbers steps in order even after skipped clicks', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    click('save')
    click('save')
    click('cancel')

    const flow = recording.stop()
    recording = null
    expect(flow.steps.map((step) => step.id)).toEqual(['s1', 's2'])
  })

  it('shows a badge so nobody is recorded without knowing', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    const badge = document
      .querySelector(OVERLAY_TAG)
      ?.shadowRoot?.querySelector('[data-wendmark="recording-badge"]')
    expect(badge?.textContent).toContain('Recording')
  })

  it('takes the badge away when recording stops', () => {
    renderPage()
    recording = startRecording({ doc: document, view: window })
    recording.stop()
    recording = null
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })
})
