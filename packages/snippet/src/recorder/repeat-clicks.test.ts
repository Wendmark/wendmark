import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRecording, type Recording } from './recorder'

/**
 * Pressing one control more than once.
 *
 * Two clicks in quick succession are one intention — a double click, or an
 * impatient second press on a button that has not responded yet. Two clicks
 * further apart are two intentions: a quantity stepper pressed three times
 * means three, and recording that as one leaves the person following the
 * guidance with one bag of coffee instead of three.
 */

let recording: Recording | null = null

function renderPage(): void {
  document.body.innerHTML = `
    <div class="quantity">
      <button id="less" type="button">−</button>
      <output>1</output>
      <button id="more" type="button">+</button>
    </div>
    <button id="save" type="button">Save changes</button>
  `
}

function click(id: string): void {
  document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function texts(): string[] {
  const flow = recording?.stop()
  recording = null
  return flow?.steps.map((step) => step.text) ?? []
}

beforeEach(() => {
  vi.useFakeTimers()
  renderPage()
  recording = startRecording({ doc: document, view: window, showBadge: false })
})

afterEach(() => {
  recording?.stop()
  recording = null
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('pressing the same control again', () => {
  it('records each press when they are seconds apart', () => {
    click('more')
    vi.advanceTimersByTime(1_500)
    click('more')
    vi.advanceTimersByTime(1_500)
    click('more')

    expect(texts()).toHaveLength(3)
  })

  it('still treats a double click as one step', () => {
    click('save')
    vi.advanceTimersByTime(80)
    click('save')

    expect(texts()).toHaveLength(1)
  })

  it('still swallows an impatient second press on a slow button', () => {
    click('save')
    vi.advanceTimersByTime(400)
    click('save')

    expect(texts()).toHaveLength(1)
  })

  it('records a press that comes back to a control after another one', () => {
    // Nothing to do with timing: a different element in between has always
    // made the next press a new step.
    click('more')
    click('less')
    click('more')

    expect(texts()).toEqual(['Click +', 'Click −', 'Click +'])
  })
})

describe('what a repeated press is taken to mean', () => {
  it('does not call a stepper the user’s own data', () => {
    // A quantity stepper is fixed UI. Three sibling children of a div could
    // look like a collection, so this is worth pinning down.
    click('more')
    vi.advanceTimersByTime(1_500)
    click('more')

    const flow = recording?.stop()
    recording = null
    expect(flow?.steps.every((step) => step.type === 'action' && !step.dynamic)).toBe(true)
  })
})
