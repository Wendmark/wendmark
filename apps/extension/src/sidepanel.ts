/**
 * The side panel: Chrome's panel beside the page, opened by the toolbar
 * icon. It lists the guides kept for the site in the current tab, with
 * Record to make another, and Pin and Delete for each.
 *
 * It is an extension page, so it can read storage directly; it learns which
 * site the tab is on from what the content script reported (tabs.ts). It
 * redraws whenever storage changes or another tab comes to the front.
 */
import { KEEP_FOR_MS, guidesFor, removeGuide, setPinned, type StoredGuide } from './guides'
import type { RecordReply } from './messages'
import { draftOf, siteOf } from './tabs'

const app = document.getElementById('app') as HTMLElement
const local = chrome.storage.local

/** A note under the Record button, until the next redraw replaces it. */
let note: string | null = null

async function activeTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props.className) node.className = props.className
  if (props.text !== undefined) node.textContent = props.text
  return node
}

const DAY = 24 * 60 * 60 * 1000

function whenRecorded(guide: StoredGuide, now: number): string {
  const days = Math.floor((now - guide.createdAt) / DAY)
  const age = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  if (guide.pinned) return `${age} · pinned`
  const left = Math.max(0, Math.ceil((guide.createdAt + KEEP_FOR_MS - now) / DAY))
  return `${age} · kept ${left} more day${left === 1 ? '' : 's'}`
}

function guideItem(guide: StoredGuide, now: number): HTMLLIElement {
  const item = element('li')
  const steps = guide.flow.steps.length
  item.append(
    element('p', { className: 'name', text: guide.flow.name }),
    element('p', {
      className: 'meta',
      text: `${steps} step${steps === 1 ? '' : 's'} · ${whenRecorded(guide, now)}`,
    }),
  )

  const actions = element('div', { className: 'actions' })
  const pin = element('button', { text: guide.pinned ? 'Pinned' : 'Pin' })
  pin.type = 'button'
  pin.setAttribute('aria-pressed', String(guide.pinned))
  pin.title = guide.pinned ? 'Kept until you delete it' : 'Keep it past 30 days'
  pin.addEventListener('click', () => void setPinned(local, guide.id, !guide.pinned))

  const remove = element('button', { text: 'Delete' })
  remove.type = 'button'
  remove.addEventListener('click', () => {
    if (confirm(`Delete “${guide.flow.name}”?`)) void removeGuide(local, guide.id)
  })

  actions.append(pin, remove)
  item.append(actions)
  return item
}

async function render(): Promise<void> {
  const tabId = await activeTabId()
  const site = tabId === null ? null : await siteOf(tabId)
  const now = Date.now()
  const view = document.createDocumentFragment()

  if (tabId === null || site === null) {
    const unfinished = tabId === null ? null : await draftOf(tabId)
    view.append(
      element('p', {
        className: 'hint',
        text: unfinished
          ? 'The page reloaded during a recording. Click the Wendmark icon in the toolbar to carry on.'
          : 'Click the Wendmark icon in the toolbar on the page you want to show someone.',
      }),
    )
    app.replaceChildren(view)
    return
  }

  view.append(
    element('h1', { text: 'Guides on this site' }),
    element('p', { className: 'site', text: new URL(site).host || site }),
  )

  const record = element('button', { className: 'record', text: 'Record a process' })
  record.type = 'button'
  record.addEventListener('click', () => void startRecording(tabId, record))
  view.append(record)
  if (note) view.append(element('p', { className: 'note', text: note }))

  const guides = await guidesFor(local, site, now)
  if (guides.length === 0) {
    view.append(
      element('p', {
        className: 'note',
        text: 'Nothing recorded here yet. Guides stay in this browser for 30 days unless pinned.',
      }),
    )
  } else {
    const list = element('ul')
    list.append(...guides.map((guide) => guideItem(guide, now)))
    view.append(list)
  }

  app.replaceChildren(view)
}

async function startRecording(tabId: number, button: HTMLButtonElement): Promise<void> {
  button.disabled = true
  const answer = (await chrome.runtime.sendMessage({ type: 'wendmark:record', tabId })) as
    RecordReply | undefined
  note = answer?.ok
    ? 'Recording. Use the page as you normally would; each click becomes a step.'
    : 'The page changed since the icon was clicked. Click the Wendmark icon again, then Record.'
  await render()
}

function refresh(): void {
  note = null
  void render()
}

chrome.storage.onChanged.addListener(() => void render())
chrome.tabs.onActivated.addListener(refresh)
chrome.tabs.onUpdated.addListener((_tabId, change) => {
  if (change.status) refresh()
})

void render()
