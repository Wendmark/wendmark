import type { ActionStep } from '@wendmark/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OVERLAY_TAG } from '../overlay/overlay'
import type { Recording, RecordingOptions } from '../recorder/recorder'
import type { SnippetApi } from './loader'
import { startRecorder, type Recorder } from './recorder-ui'

/**
 * The recorder UI with its save left to the caller: what the portal and the
 * browser extension both build on.
 */

const step: ActionStep = {
  type: 'action',
  id: 's1',
  text: 'Click Save',
  dynamic: false,
  target: { selectors: ['#save'], role: 'button', name: 'Save' },
}

let recorder: Recorder | null = null
afterEach(() => {
  recorder?.stop()
  recorder = null
  document.body.innerHTML = ''
})

/** An engine whose recorder we can feed steps to by hand. */
function fakeApi() {
  let onStep: RecordingOptions['onStep']
  const api: SnippetApi = {
    startFlow: vi.fn(),
    stopFlow: vi.fn(),
    startRecording: (options: RecordingOptions): Recording => {
      onStep = options.onStep
      return { stop: vi.fn() } as unknown as Recording
    },
  }
  return { api, click: () => onStep?.(step, { replacesLast: false }) }
}

function root(): ShadowRoot {
  const host = document.querySelector(OVERLAY_TAG)
  if (!host?.shadowRoot) throw new Error('no overlay')
  return host.shadowRoot
}

function button(label: string): HTMLButtonElement {
  const found = [...root().querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!found) throw new Error(`no ${label} button`)
  return found
}

describe('startRecorder', () => {
  it('reports every change, and hands the finished flow to save', async () => {
    const { api, click } = fakeApi()
    const onChange = vi.fn()
    const save = vi.fn(() => Promise.resolve({ ok: true as const, message: 'Kept it.' }))
    recorder = startRecorder({ doc: document, view: window, api, save, savingText: '…', onChange })

    click()
    expect(onChange).toHaveBeenLastCalledWith({ name: 'Untitled process', steps: [step] })

    button('Save').click()
    await vi.waitFor(() => expect(root().textContent).toContain('Kept it.'))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ steps: [step] }))
  })

  it('shows what went wrong when saving fails, and records again', async () => {
    const { api, click } = fakeApi()
    const save = vi.fn(() => Promise.resolve({ ok: false as const, error: 'No room.' }))
    recorder = startRecorder({ doc: document, view: window, api, save, savingText: '…' })

    click()
    button('Save').click()
    await vi.waitFor(() => expect(root().textContent).toContain('No room.'))
  })

  it('carries on with a draft it is given', () => {
    const { api } = fakeApi()
    recorder = startRecorder({
      doc: document,
      view: window,
      api,
      save: vi.fn(),
      savingText: '…',
      draft: { name: 'Change your plan', steps: [step] },
    })
    expect(root().querySelector('.wm-bar .label')?.textContent).toBe('Recording · 1 step')
  })

  it('says when it was closed, once', () => {
    const { api } = fakeApi()
    const onClose = vi.fn()
    recorder = startRecorder({
      doc: document,
      view: window,
      api,
      save: vi.fn(),
      savingText: '…',
      onClose,
    })
    recorder.stop()
    recorder.stop()
    expect(onClose).toHaveBeenCalledOnce()
    expect(document.querySelector(OVERLAY_TAG)).toBeNull()
  })
})
