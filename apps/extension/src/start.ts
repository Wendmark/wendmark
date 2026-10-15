/**
 * The start page: a shared guide, waiting for the person to say yes.
 *
 * The play page on wendmark.dev handed the guide over and the worker opened
 * this page in that tab. Chrome lets an extension ask for access to a site
 * only in answer to a click on one of its own pages, so this is where the
 * question is asked, plainly: which site, and what will happen there.
 *
 * Allowed: the tab goes to the site and the guide plays (background.ts
 * injects it there). Refused, or "Not now": nothing is opened and nothing is
 * kept, and the steps are listed to follow by hand.
 */
import type { Flow } from '@wendmark/core'
import { sitePattern, startUrl, stepsAsLines } from './play'
import { clearWaitingToStart, setPlaying, waitingToStart } from './tabs'
import type { Shared } from './transfer'

const app = document.getElementById('app') as HTMLElement

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props.className) node.className = props.className
  if (props.text !== undefined) node.textContent = props.text
  return node
}

function stepList(flow: Flow): HTMLOListElement {
  const list = element('ol', { className: 'steps' })
  for (const line of stepsAsLines(flow)) {
    list.append(element('li', { text: line.replace(/^\d+\.\s/, '') }))
  }
  return list
}

/** Nothing opened, nothing kept: the steps, to follow by hand. */
function declined(shared: Shared, why: string): void {
  const host = new URL(shared.origin).host
  const open = element('a', { text: `Open ${host}` })
  open.href = startUrl(shared)
  const paragraph = element('p')
  paragraph.append(open, ' and follow these steps yourself:')
  app.replaceChildren(
    element('h1', { text: shared.flow.name }),
    element('p', { className: 'lead', text: why }),
    paragraph,
    stepList(shared.flow),
  )
}

function ask(tabId: number, shared: Shared): void {
  const host = new URL(shared.origin).host

  const allow = element('button', { className: 'primary', text: `Allow ${host} and start` })
  allow.type = 'button'
  allow.addEventListener('click', () => {
    // Asked straight from the click, before anything else: Chrome allows
    // the question only then.
    void chrome.permissions
      .request({ origins: [sitePattern(shared.origin)] })
      .then(async (granted) => {
        await clearWaitingToStart(tabId)
        if (!granted) {
          declined(shared, `Nothing was opened, and Wendmark has no access to ${host}.`)
          return
        }
        await setPlaying(tabId, { shared, stepIndex: 0 })
        await chrome.tabs.update(tabId, { url: startUrl(shared) })
      })
  })

  const notNow = element('button', { text: 'Not now' })
  notNow.type = 'button'
  notNow.addEventListener('click', () => {
    void clearWaitingToStart(tabId).then(() =>
      declined(shared, `Nothing was opened, and Wendmark has no access to ${host}.`),
    )
  })

  const buttons = element('div', { className: 'buttons' })
  buttons.append(allow, notNow)

  const details = element('details')
  details.append(
    element('summary', {
      text: `The ${shared.flow.steps.length} step${shared.flow.steps.length === 1 ? '' : 's'}`,
    }),
    stepList(shared.flow),
  )

  app.replaceChildren(
    element('h1', { text: shared.flow.name }),
    element('p', {
      className: 'lead',
      text: `Someone shared a guide for ${host}. Wendmark will open it in this tab, signed in as you, and point at each step. You do the clicking; Wendmark never clicks for you.`,
    }),
    element('p', {
      className: 'lead',
      text: `Chrome will ask you to let Wendmark read and change ${host}. That is how it can point at things there. It is for that one site, and only for guides you start.`,
    }),
    buttons,
    details,
  )
}

async function main(): Promise<void> {
  const tab = await chrome.tabs.getCurrent()
  const shared = tab?.id === undefined ? null : await waitingToStart(tab.id)
  if (!tab?.id || !shared) {
    app.replaceChildren(
      element('h1', { text: 'Nothing to start' }),
      element('p', {
        className: 'lead',
        text: 'Open the Wendmark link you were sent again, and press Start.',
      }),
    )
    return
  }
  ask(tab.id, shared)
}

void main()
