import { afterEach, describe, expect, it } from 'vitest'
import { startRecording, type Recording } from './recorder'

/**
 * What the recorder guesses about a step pointing at the user's own data.
 *
 * The guess is a default, not a decision — the panel shows it and the
 * author can disagree. But getting it wrong is silent: a step that looks
 * for the author's own row sits there searching in everybody else's
 * account, so the default is worth checking.
 */

let recording: Recording | null = null

function record(html: string, id: string) {
  document.body.innerHTML = html
  recording = startRecording({ doc: document, view: window, showBadge: false })
  document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

  const flow = recording.stop()
  recording = null
  const [step] = flow.steps
  if (!step || step.type !== 'action') throw new Error('expected one action step')
  return step
}

afterEach(() => {
  recording?.stop()
  recording = null
  document.body.innerHTML = ''
})

describe('clicking something in a list', () => {
  it('marks a card in a grid of products as their own data', () => {
    const step = record(
      `<div class="grid">
         <div class="card"><h3>Kiambu AA</h3><button id="buy">Add to subscription</button></div>
         <div class="card"><h3>Huila Castillo</h3><button>Add to subscription</button></div>
         <div class="card"><h3>Yirgacheffe</h3><button>Add to subscription</button></div>
       </div>`,
      'buy',
    )

    expect(step.dynamic).toBe(true)
  })

  it('marks a link in a table of orders as their own data', () => {
    const step = record(
      `<table><tbody>
         <tr><td><a id="order" href="/orders/10421">FK-10421</a></td></tr>
         <tr><td><a href="/orders/10588">FK-10588</a></td></tr>
       </tbody></table>`,
      'order',
    )

    expect(step.dynamic).toBe(true)
  })
})

describe('clicking a fixed part of the app', () => {
  it('leaves a navigation link alone', () => {
    const step = record(
      `<nav>
         <a href="/shop">Shop</a>
         <a id="orders" href="/orders">Orders</a>
         <a href="/profile">Profile</a>
       </nav>`,
      'orders',
    )

    expect(step.dynamic).toBe(false)
  })

  it('leaves a form’s submit button alone', () => {
    const step = record(
      `<form>
         <label>Name <input name="name" /></label>
         <button id="save" type="submit">Save changes</button>
       </form>`,
      'save',
    )

    expect(step.dynamic).toBe(false)
  })
})
