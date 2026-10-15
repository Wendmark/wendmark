/**
 * The side panel: Chrome's panel beside the page, opened by the toolbar
 * icon. It lists the guides kept for the site in the current tab, with
 * Record to make another, and Pin and Delete for each.
 *
 * "Prepare to share" opens a guide's preview: exactly what would leave the
 * browser, from the same function sharing uses (share.ts), with the
 * choices that change it — masking, steps left out, notes — beside it.
 *
 * It is an extension page, so it can read storage directly; it learns which
 * site the tab is on from what the content script reported (tabs.ts). It
 * redraws whenever storage changes or another tab comes to the front.
 */
import type { Step } from '@wendmark/core'
import {
  KEEP_FOR_MS,
  addGuide,
  guidesFor,
  removeGuide,
  setPinned,
  setShare,
  shareOf,
  type StoredGuide,
} from './guides'
import type { RecordReply } from './messages'
import { MAX_NOTE, shareable, type ShareSettings } from './share'
import {
  FILE_EXTENSION,
  fileName,
  fromFile,
  fromPasted,
  linkIfShort,
  toFile,
  toText,
  type Shared,
} from './transfer'
import { draftOf, siteOf } from './tabs'

const app = document.getElementById('app') as HTMLElement
const local = chrome.storage.local

/** A note under the Record button, until the next redraw replaces it. */
let note: string | null = null

/** The guide whose preview is open, if any. */
let opened: string | null = null

/** The step whose note is being written, if any. */
let editingNote: string | null = null

/** What the last share or import button did, said under the buttons. */
let said: string | null = null

/** Whether the paste box for importing is open. */
let importing = false

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

  const prepare = element('button', { text: 'Prepare to share' })
  prepare.type = 'button'
  prepare.addEventListener('click', () => {
    opened = guide.id
    editingNote = null
    said = null
    void render()
  })

  actions.append(prepare, pin, remove)
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
      importBox(),
    )
    if (said) view.append(element('p', { className: 'note', text: said }))
    app.replaceChildren(view)
    return
  }

  const guides = await guidesFor(local, site, now)
  const open = guides.find((guide) => guide.id === opened)
  if (open) {
    app.replaceChildren(preview(open))
    return
  }
  opened = null

  view.append(
    element('h1', { text: 'Guides on this site' }),
    element('p', { className: 'site', text: new URL(site).host || site }),
  )

  const record = element('button', { className: 'record', text: 'Record a process' })
  record.type = 'button'
  record.addEventListener('click', () => void startRecording(tabId, record))
  view.append(record)
  if (note) view.append(element('p', { className: 'note', text: note }))

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

  view.append(importBox())
  if (said) view.append(element('p', { className: 'note', text: said }))

  app.replaceChildren(view)
}

/** Saves a change to a guide's sharing choices; storage redraws the panel. */
function change(guide: StoredGuide, next: Partial<ShareSettings>): void {
  void setShare(local, guide.id, { ...shareOf(guide), ...next })
}

/** Where a step happened, as a path, if it says. */
function pageOf(step: Step): string | null {
  return step.type === 'instruction' ? null : (step.target.url ?? null)
}

function maskingChoice(guide: StoredGuide, settings: ShareSettings): HTMLFieldSetElement {
  const choice = element('fieldset', { className: 'choice' })
  choice.append(element('legend', { text: 'Words from the page' }))
  const options: [ShareSettings['labels'], string, string][] = [
    ['none', 'Structure only', 'Names, numbers and other words from the page are taken out.'],
    ['all', 'Keep the words', 'Only if nothing on these pages is private.'],
  ]
  for (const [value, label, help] of options) {
    const row = element('label', { className: 'option' })
    const input = element('input')
    input.type = 'radio'
    input.name = 'labels'
    input.value = value
    input.checked = settings.labels === value
    input.addEventListener('change', () => change(guide, { labels: value }))
    const words = element('span')
    words.append(element('strong', { text: label }), element('small', { text: help }))
    row.append(input, words)
    choice.append(row)
  }
  return choice
}

function noteEditor(guide: StoredGuide, settings: ShareSettings, id: string): HTMLElement {
  const editor = element('div', { className: 'note-editor' })
  const field = element('textarea')
  field.rows = 2
  field.maxLength = MAX_NOTE
  field.value = settings.notes[id] ?? ''
  field.placeholder = 'e.g. type −1 in Quantity'
  field.setAttribute('aria-label', 'Note for this step')

  const save = element('button', { text: 'Save note' })
  save.type = 'button'
  save.addEventListener('click', () => {
    const notes = { ...settings.notes }
    const text = field.value.trim()
    if (text) notes[id] = text
    else delete notes[id]
    editingNote = null
    change(guide, { notes })
  })
  const cancel = element('button', { text: 'Cancel' })
  cancel.type = 'button'
  cancel.addEventListener('click', () => {
    editingNote = null
    void render()
  })

  const buttons = element('div', { className: 'actions' })
  buttons.append(save, cancel)
  editor.append(field, buttons)
  queueMicrotask(() => field.focus())
  return editor
}

/**
 * A guide as it would be shared. The list is the output itself, not a
 * nicer version of it: what is shown here is what is sent.
 */
function preview(guide: StoredGuide): DocumentFragment {
  const settings = shareOf(guide)
  const shared = shareable(guide.flow, settings)
  const view = document.createDocumentFragment()

  const back = element('button', { className: 'back', text: '← All guides' })
  back.type = 'button'
  back.addEventListener('click', () => {
    opened = null
    editingNote = null
    said = null
    void render()
  })

  view.append(
    back,
    element('h1', { text: guide.flow.name }),
    element('p', {
      className: 'site',
      text: 'Check every step before you share it. This is exactly what will be sent; nothing anyone typed is in it.',
    }),
    maskingChoice(guide, settings),
  )

  if (!shared) {
    view.append(
      element('p', {
        className: 'note',
        text: 'Every step is left out. Put some back to share it.',
      }),
    )
  } else {
    const list = element('ol', { className: 'preview' })
    for (const step of shared.steps) {
      const item = element('li')
      item.append(element('p', { className: 'name', text: step.text }))
      const page = pageOf(step)
      if (page) item.append(element('p', { className: 'meta', text: page }))

      if (editingNote === step.id) {
        item.append(noteEditor(guide, settings, step.id))
      } else {
        const actions = element('div', { className: 'actions' })
        const noteButton = element('button', {
          text: settings.notes[step.id] ? 'Edit note' : 'Add a note',
        })
        noteButton.type = 'button'
        noteButton.addEventListener('click', () => {
          editingNote = step.id
          void render()
        })
        const leaveOut = element('button', { text: 'Leave out' })
        leaveOut.type = 'button'
        leaveOut.addEventListener('click', () =>
          change(guide, { removed: [...settings.removed, step.id] }),
        )
        actions.append(noteButton, leaveOut)
        item.append(actions)
      }
      list.append(item)
    }
    view.append(list)
  }

  const left = guide.flow.steps.filter((step) => settings.removed.includes(step.id)).length
  if (left > 0) {
    const row = element('p', {
      className: 'note',
      text: `${left} step${left === 1 ? '' : 's'} left out. `,
    })
    const restore = element('button', { className: 'link', text: 'Put them back' })
    restore.type = 'button'
    restore.addEventListener('click', () => change(guide, { removed: [] }))
    row.append(restore)
    view.append(row)
  }

  if (shared) view.append(shareButtons({ origin: guide.origin, flow: shared }))
  if (said) view.append(element('p', { className: 'note', text: said }))

  return view
}

function button(text: string, onClick: () => void, className?: string): HTMLButtonElement {
  const node = element('button', { text, ...(className ? { className } : {}) })
  node.type = 'button'
  node.addEventListener('click', onClick)
  return node
}

function say(text: string): void {
  said = text
  void render()
}

async function copy(text: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    say(done)
  } catch {
    say('Could not copy. Click inside this panel first, then try again.')
  }
}

/** Saves text as a file in the person's downloads, without asking for a permission. */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = element('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The three ways a guide leaves: what the preview shows, nothing else. */
function shareButtons(shared: Shared): HTMLElement {
  const box = element('div', { className: 'share' })
  box.append(element('h2', { text: 'Share it' }))

  const buttons = element('div', { className: 'share-buttons' })
  buttons.append(
    button(
      'Copy link',
      () =>
        void (async () => {
          const link = await linkIfShort(shared)
          if (link) {
            await copy(link, 'Link copied. Whoever opens it is guided on their own account.')
          } else {
            say('This guide is too long for a link. Save it as a file and send that instead.')
          }
        })(),
      'primary',
    ),
    button(
      'Copy as text',
      () =>
        void (async () => {
          await copy(
            toText(shared, await linkIfShort(shared)),
            'Steps copied, with the link underneath. Paste them into a ticket or a chat.',
          )
        })(),
    ),
    button('Save as file', () => {
      download(fileName(shared), toFile(shared))
      say(`Saved as a ${FILE_EXTENSION} file in your downloads.`)
    }),
  )
  box.append(buttons)
  return box
}

/** Keeps a guide someone sent, and says where it is listed. */
async function keep(shared: Shared | null): Promise<void> {
  if (!shared) {
    say('That is not a Wendmark guide, or it was made by a newer version.')
    return
  }
  await addGuide(local, shared.flow, shared.origin)
  importing = false
  say(`Imported “${shared.flow.name}”. It is listed on ${new URL(shared.origin).host}.`)
}

function importBox(): HTMLElement {
  const box = element('div', { className: 'import' })
  box.append(element('h2', { text: 'Import a guide' }))

  if (importing) {
    const field = element('textarea')
    field.rows = 3
    field.placeholder = 'Paste a Wendmark link, or text that has one in it'
    field.setAttribute('aria-label', 'A Wendmark link or text')
    const actions = element('div', { className: 'actions' })
    actions.append(
      button('Import', () => void fromPasted(field.value).then(keep)),
      button('Cancel', () => {
        importing = false
        void render()
      }),
    )
    box.append(field, actions)
    queueMicrotask(() => field.focus())
  } else {
    const picker = element('input')
    picker.type = 'file'
    picker.accept = `${FILE_EXTENSION},application/json`
    picker.hidden = true
    picker.addEventListener('change', () => {
      const file = picker.files?.[0]
      if (file) void file.text().then((text) => keep(fromFile(text)))
    })
    const actions = element('div', { className: 'actions' })
    actions.append(
      button('Paste a link', () => {
        importing = true
        said = null
        void render()
      }),
      button('Open a file', () => picker.click()),
    )
    box.append(actions, picker)
  }
  return box
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
