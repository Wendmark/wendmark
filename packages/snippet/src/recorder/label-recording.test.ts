import { afterEach, describe, expect, it, vi } from 'vitest'
import { startRecording, type Recording } from './recorder'

let recording: Recording | null = null

afterEach(() => {
  recording?.stop()
  recording = null
  document.body.innerHTML = ''
})

function record() {
  const onStep = vi.fn()
  recording = startRecording({ doc: document, view: window, showBadge: false, onStep })
  return onStep
}

function stop() {
  const flow = recording?.stop()
  recording = null
  if (!flow) throw new Error('not recording')
  return flow
}

function clickOn(selector: string): void {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`no ${selector}`)
  element.click()
}

describe('clicking a label', () => {
  it('records one step for a label wrapping a radio, not three', () => {
    document.body.innerHTML = `
      <fieldset>
        <label class="option"><input type="radio" name="plan" value="one"><strong>One bag / month</strong></label>
        <label class="option"><input type="radio" name="plan" value="four"><strong id="four">Four bags / month</strong></label>
      </fieldset>`
    record()
    clickOn('#four')

    const flow = stop()
    expect(flow.steps).toHaveLength(1)
    expect(flow.steps[0]?.text).toBe('Choose Four bags / month')
  })

  it('points the step at the label the person clicked, which is what they can see', () => {
    document.body.innerHTML = `
      <label class="option" id="lbl"><input type="radio" name="plan"><strong id="four">Four bags</strong></label>`
    record()
    clickOn('#four')

    const [step] = stop().steps
    if (step?.type !== 'action') throw new Error('expected an action step')
    expect(step.target.selectors.some((selector) => selector.includes('label'))).toBe(true)
  })

  it('records one step for a label tied to its field with for=', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="gift"><label for="gift" id="gift-label">Gift wrap</label>`
    record()
    clickOn('#gift-label')

    const flow = stop()
    expect(flow.steps).toHaveLength(1)
    expect(flow.steps[0]?.text).toBe('Tick Gift wrap')
  })

  it('still records a click on the radio itself, once', () => {
    document.body.innerHTML = `
      <label><input type="radio" name="plan" id="r1"> One bag</label>`
    record()
    clickOn('#r1')

    expect(stop().steps).toHaveLength(1)
  })

  it('records the next control after a label normally', () => {
    document.body.innerHTML = `
      <label class="option"><input type="radio" name="plan"><strong id="four">Four bags</strong></label>
      <button id="save" type="button">Save plan</button>`
    record()
    clickOn('#four')
    clickOn('#save')

    expect(stop().steps.map((step) => step.text)).toEqual(['Choose Four bags', 'Click Save plan'])
  })
})

describe('telling a live step list about replacements', () => {
  it('says when a step replaces the one before it, so the list can drop the old one', () => {
    document.body.innerHTML = `<label>Email <input id="email" name="email"></label>`
    const onStep = record()

    const field = document.getElementById('email') as HTMLInputElement
    field.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))

    expect(onStep).toHaveBeenCalledTimes(2)
    expect(onStep.mock.calls[0]?.[1]).toEqual({ replacesLast: false })
    expect(onStep.mock.calls[1]?.[1]).toEqual({ replacesLast: true })
    expect(stop().steps).toHaveLength(1)
  })
})
