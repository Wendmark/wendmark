import {
  getActiveRecording,
  startRecording,
  discardRecording,
  finishRecording,
  listRawRecordings,
  deleteRawRecording,
  RECORDING_STORAGE_KEYS,
  type RawRecording,
} from '../recording'
import { generateProcess } from '../generator/generate'
import { listProcesses, saveProcess } from '../processes'
import type { Process } from '../types'

const $ = (id: string) => document.getElementById(id)!
const statusEl = $('status')
const recordBtn = $('record') as HTMLButtonElement
const saveForm = $('save-form')
const nameInput = $('rec-name') as HTMLInputElement

function setStatus(text: string): void {
  statusEl.textContent = text
}

async function sendToActiveTab(type: string, process?: Process): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return false
  try {
    await chrome.tabs.sendMessage(tab.id, { type, process })
    return true
  } catch {
    return false
  }
}

// ---- Play ----

$('play').addEventListener('click', async () => {
  const ok = await sendToActiveTab('WEND_PLAY')
  setStatus(ok ? 'Guidance started.' : 'Wend isn’t loaded on this page — open an allowed site and reload it.')
})

$('stop-play').addEventListener('click', async () => {
  const ok = await sendToActiveTab('WEND_STOP')
  setStatus(ok ? 'Guidance stopped.' : 'Wend isn’t loaded on this page.')
})

// ---- Record ----

async function refreshRecordUI(): Promise<void> {
  const active = await getActiveRecording()
  if (active) {
    recordBtn.textContent = `Stop recording (${active.clicks.length} click${active.clicks.length === 1 ? '' : 's'})`
    recordBtn.classList.remove('danger')
    recordBtn.classList.add('secondary')
  } else {
    recordBtn.textContent = 'Start recording'
    recordBtn.classList.add('danger')
    recordBtn.classList.remove('secondary')
    saveForm.classList.add('hidden')
  }
}

recordBtn.addEventListener('click', async () => {
  const active = await getActiveRecording()
  if (!active) {
    const ok = await sendToActiveTab('WEND_RECORD_START')
    if (!ok) {
      setStatus('Wend isn’t loaded on this page — open an allowed site and reload it.')
      return
    }
    await startRecording()
    setStatus('Recording… every click on the page is captured.')
    await refreshRecordUI()
  } else {
    // Stop capturing, then let the user name and save the raw recording.
    await sendToActiveTab('WEND_RECORD_STOP')
    saveForm.classList.remove('hidden')
    nameInput.focus()
    setStatus(`Captured ${active.clicks.length} clicks. Name it to save.`)
  }
})

$('save').addEventListener('click', async () => {
  const name = nameInput.value.trim()
  if (!name) {
    setStatus('Give the recording a name first.')
    nameInput.focus()
    return
  }
  const saved = await finishRecording(name)
  nameInput.value = ''
  setStatus(saved ? `Saved “${saved.name}” (${saved.clicks.length} clicks).` : 'Nothing to save.')
  await refreshRecordUI()
  await refreshRecordingsList()
})

$('discard').addEventListener('click', async () => {
  await discardRecording()
  nameInput.value = ''
  setStatus('Recording discarded.')
  await refreshRecordUI()
})

// ---- Saved recordings list ----

async function refreshRecordingsList(): Promise<void> {
  const recordings = await listRawRecordings()
  const section = $('recordings-section')
  const list = $('recordings')
  section.classList.toggle('hidden', recordings.length === 0)
  list.textContent = ''
  for (const rec of recordings) {
    const li = document.createElement('li')
    const name = document.createElement('span')
    name.className = 'name'
    name.textContent = rec.name
    const count = document.createElement('span')
    count.className = 'count'
    count.textContent = `${rec.clicks.length} clicks`
    const genBtn = document.createElement('button')
    genBtn.className = 'primary'
    genBtn.textContent = '✨ Generate'
    genBtn.addEventListener('click', () => void generate(rec, genBtn))
    const delBtn = document.createElement('button')
    delBtn.className = 'secondary'
    delBtn.textContent = '🗑'
    delBtn.title = 'Delete recording'
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Delete recording “${rec.name}”?`)) return
      await deleteRawRecording(rec.id)
      setStatus(`Deleted “${rec.name}”.`)
      await refreshRecordingsList()
    })
    li.append(name, count, genBtn, delBtn)
    list.appendChild(li)
  }
}

async function generate(recording: RawRecording, button: HTMLButtonElement): Promise<void> {
  button.disabled = true
  button.textContent = 'Generating…'
  setStatus('Asking Claude to clean up the recording — keep this popup open.')
  try {
    const process = await generateProcess(recording)
    await saveProcess(process)
    setStatus(`Generated “${process.name}” (${process.steps.length} steps).`)
    await refreshProcessesList()
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Generation failed.')
  } finally {
    button.disabled = false
    button.textContent = '✨ Generate'
  }
}

// ---- Generated processes ----

async function refreshProcessesList(): Promise<void> {
  const processes = await listProcesses()
  const section = $('processes-section')
  const list = $('processes')
  section.classList.toggle('hidden', processes.length === 0)
  list.textContent = ''
  for (const proc of processes) {
    const li = document.createElement('li')
    const name = document.createElement('span')
    name.className = 'name'
    name.textContent = proc.name
    const count = document.createElement('span')
    count.className = 'count'
    count.textContent = `${proc.steps.length} steps`
    const playBtn = document.createElement('button')
    playBtn.className = 'secondary'
    playBtn.textContent = '▶ Play'
    playBtn.addEventListener('click', async () => {
      const ok = await sendToActiveTab('WEND_PLAY', proc)
      setStatus(ok ? `Playing “${proc.name}”.` : 'Wend isn’t loaded on this page.')
    })
    li.append(name, count, playBtn)
    list.appendChild(li)
  }
}

// Live-update the click count while recording (popup can stay open).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[RECORDING_STORAGE_KEYS.ACTIVE_KEY]) {
    const stillActive = changes[RECORDING_STORAGE_KEYS.ACTIVE_KEY].newValue
    if (stillActive && saveForm.classList.contains('hidden')) void refreshRecordUI()
  }
})

$('editor').addEventListener('click', () => {
  void chrome.runtime.openOptionsPage()
  window.close()
})

void refreshRecordUI()
void refreshRecordingsList()
void refreshProcessesList()
