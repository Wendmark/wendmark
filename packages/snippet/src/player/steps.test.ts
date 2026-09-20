import type { Flow } from '@wendmark/core'
import { afterEach, describe, expect, it } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import { setRect } from '../test-utils'
import { startFlow, type Player } from './player'

let player: Player | null = null

function root(): ShadowRoot {
  const found = document.querySelector(OVERLAY_TAG)?.shadowRoot
  if (!found) throw new Error('no overlay')
  return found
}

function part(name: string): HTMLElement | null {
  return root().querySelector(`[data-wendmark="${name}"]`)
}

function panelText(name: string): string {
  return part(name)?.textContent ?? ''
}

function clickElement(element: Element | null): void {
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

afterEach(() => {
  player?.stop()
  player = null
  document.body.innerHTML = ''
})

describe('instruction steps', () => {
  const flow: Flow = {
    schemaVersion: 1,
    id: 'read-me',
    name: 'Read this',
    steps: [
      { type: 'instruction', id: 's1', text: 'Your first bag ships on Monday.' },
      { type: 'instruction', id: 's2', text: 'You can pause any time.' },
    ],
  }

  it('offers a way to continue that is not "skip"', () => {
    player = startFlow(flow, { doc: document, view: window })
    expect(panelText('primary')).toBe('Got it')
  })

  it('moves on when the user acknowledges it', () => {
    player = startFlow(flow, { doc: document, view: window })
    ;(part('primary') as HTMLButtonElement).click()
    expect(panelText('step-text')).toBe('You can pause any time.')
  })

  it('highlights nothing, because there is nothing to point at', () => {
    player = startFlow(flow, { doc: document, view: window })
    const ring = part('ring')
    expect(ring?.style.display).toBe('none')
  })

  it('does not offer "Got it" on a step with a target', () => {
    document.body.innerHTML = '<button id="save">Save changes</button>'
    setRect(document.getElementById('save') as Element, {
      left: 0,
      top: 0,
      width: 80,
      height: 20,
    })
    player = startFlow(
      {
        schemaVersion: 1,
        id: 'f',
        name: 'f',
        steps: [
          {
            type: 'action',
            id: 'a1',
            text: 'Click Save changes',
            dynamic: false,
            target: { selectors: ['#save'], role: 'button', name: 'Save changes' },
          },
        ],
      },
      { doc: document, view: window },
    )
    expect(part('primary')?.style.display).toBe('none')
  })
})

describe('dynamic steps', () => {
  const flow: Flow = {
    schemaVersion: 1,
    id: 'pick-coffee',
    name: 'Rate a coffee',
    steps: [
      {
        type: 'action',
        id: 's1',
        text: 'Choose the coffee you want to rate',
        dynamic: true,
        target: { selectors: ['.pick'], role: 'button', name: 'Choose' },
      },
      { type: 'instruction', id: 's2', text: 'Now write your note.' },
    ],
  }

  function renderList(): void {
    document.body.innerHTML = `
      <main>
        <ul class="list">
          <li><button class="pick" id="row1">Choose</button></li>
          <li><button class="pick" id="row2">Choose</button></li>
          <li><button class="pick" id="row3">Choose</button></li>
        </ul>
        <button id="elsewhere">Something else</button>
      </main>
    `
    for (const id of ['row1', 'row2', 'row3', 'elsewhere']) {
      setRect(document.getElementById(id) as Element, {
        left: 10,
        top: 10,
        width: 100,
        height: 30,
      })
    }
  }

  it('highlights the group rather than guessing one row', () => {
    renderList()
    player = startFlow(flow, { doc: document, view: window })
    expect(part('ring')?.style.display).toBe('block')
    expect(panelText('status')).toContain('Choose')
  })

  it('advances on a click on any of the choices', () => {
    renderList()
    player = startFlow(flow, { doc: document, view: window })
    clickElement(document.getElementById('row3'))
    expect(panelText('step-text')).toBe('Now write your note.')
  })

  it('ignores clicks outside the group', () => {
    renderList()
    player = startFlow(flow, { doc: document, view: window })
    clickElement(document.getElementById('elsewhere'))
    expect(panelText('progress')).toBe('1 / 2')
  })

  it('keeps waiting when a fixed step matches several elements', () => {
    renderList()
    player = startFlow(
      {
        ...flow,
        steps: [{ ...flow.steps[0], dynamic: false }, flow.steps[1]] as Flow['steps'],
      },
      { doc: document, view: window },
    )
    expect(panelText('status')).not.toBe('')
    clickElement(document.getElementById('row1'))
    expect(panelText('progress')).toBe('1 / 2')
  })
})
