import { useEffect, useState } from 'react'
import type { Process, Step } from '../types'
import { listProcesses, saveProcess, deleteProcess } from '../processes'

/**
 * Play a process on the most recently used tab Wend can reach (the editor
 * itself is the active tab, so we look for the freshest http(s) tab whose
 * URL is visible to us — i.e. a host-permitted page with our content script).
 */
async function playOnRecentTab(process: Process): Promise<string> {
  const tabs = await chrome.tabs.query({})
  const candidates = tabs
    .filter((t) => t.id !== undefined && t.url && /^https?:/.test(t.url))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))

  for (const tab of candidates) {
    try {
      await chrome.tabs.sendMessage(tab.id!, { type: 'WEND_PLAY', process })
      await chrome.tabs.update(tab.id!, { active: true })
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true })
      }
      return `Playing on ${new URL(tab.url!).hostname}`
    } catch {
      // Content script not present in this tab — try the next one.
    }
  }
  throw new Error('No open tab on an allowed site. Open one (e.g. wikipedia.org) and try again.')
}

export function App() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [draft, setDraft] = useState<Process | null>(null)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh(): Promise<void> {
    setProcesses(await listProcesses())
  }

  function select(process: Process): void {
    if (dirty && !confirm('Discard unsaved changes?')) return
    setDraft(structuredClone(process))
    setDirty(false)
    setStatus('')
  }

  function edit(update: (p: Process) => void): void {
    if (!draft) return
    const next = structuredClone(draft)
    update(next)
    setDraft(next)
    setDirty(true)
  }

  function moveStep(index: number, delta: -1 | 1): void {
    edit((p) => {
      const target = index + delta
      if (target < 0 || target >= p.steps.length) return
      const [step] = p.steps.splice(index, 1)
      p.steps.splice(target, 0, step)
    })
  }

  async function save(): Promise<void> {
    if (!draft) return
    await saveProcess(draft)
    setDirty(false)
    setStatus('Saved.')
    await refresh()
  }

  async function removeProcess(): Promise<void> {
    if (!draft) return
    if (!confirm(`Delete “${draft.name}”? This can't be undone.`)) return
    await deleteProcess(draft.id)
    setDraft(null)
    setDirty(false)
    setStatus('')
    await refresh()
  }

  async function play(): Promise<void> {
    if (!draft) return
    if (dirty) await save()
    try {
      setStatus(await playOnRecentTab(draft))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not start playback.')
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Wend</h1>
        <p className="subtitle">Process editor</p>
        {processes.length === 0 && (
          <p className="empty-note">
            No processes yet. Record a flow from the popup, then generate a process from it.
          </p>
        )}
        {processes.map((p) => (
          <button
            key={p.id}
            className={`process-item ${draft?.id === p.id ? 'selected' : ''}`}
            onClick={() => select(p)}
          >
            {p.name}
            <span className="steps-count">
              {p.steps.length} step{p.steps.length === 1 ? '' : 's'}
            </span>
          </button>
        ))}
      </aside>

      <main className="main">
        {!draft ? (
          <p className="placeholder">Select a process to edit it.</p>
        ) : (
          <>
            <div className="name-row">
              <input
                className="name-input"
                value={draft.name}
                onChange={(e) => edit((p) => (p.name = e.target.value))}
              />
            </div>

            <div className="toolbar">
              <button className="primary" onClick={() => void play()}>
                ▶ Play
              </button>
              <button onClick={() => void save()} disabled={!dirty}>
                {dirty ? 'Save changes' : 'Saved'}
              </button>
              <button className="danger" onClick={() => void removeProcess()}>
                Delete process
              </button>
              <span className="status">{status}</span>
            </div>

            {draft.steps.map((step, i) => (
              <StepCard
                key={i}
                step={step}
                index={i}
                total={draft.steps.length}
                onInstruction={(text) => edit((p) => (p.steps[i].instruction = text))}
                onToggleDynamic={(value) => edit((p) => (p.steps[i].dynamic = value || undefined))}
                onMove={(delta) => moveStep(i, delta)}
                onDelete={() => edit((p) => void p.steps.splice(i, 1))}
              />
            ))}
          </>
        )}
      </main>
    </div>
  )
}

function StepCard(props: {
  step: Step
  index: number
  total: number
  onInstruction: (text: string) => void
  onToggleDynamic: (value: boolean) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
}) {
  const { step, index, total } = props
  return (
    <div className="step-card">
      <div className="step-number">{index + 1}</div>
      <div className="step-body">
        <input
          className="instruction-input"
          value={step.instruction}
          onChange={(e) => props.onInstruction(e.target.value)}
        />
        <div className="step-meta" title={step.selector}>
          {step.role ? `${step.role} · ` : ''}
          {step.text ? `“${step.text}” · ` : ''}
          {step.selector}
        </div>
        <label className="dynamic-toggle" title="The target is a data item (a vessel, order, row…) — playback highlights the whole list and any item the user clicks counts.">
          <input
            type="checkbox"
            checked={step.dynamic === true}
            onChange={(e) => props.onToggleDynamic(e.target.checked)}
          />
          User picks the item (dynamic — don't match the recorded name)
        </label>
      </div>
      <div className="step-actions">
        <button className="icon-btn" onClick={() => props.onMove(-1)} disabled={index === 0} title="Move up">
          ↑
        </button>
        <button
          className="icon-btn"
          onClick={() => props.onMove(1)}
          disabled={index === total - 1}
          title="Move down"
        >
          ↓
        </button>
        <button className="icon-btn delete" onClick={props.onDelete} title="Delete step">
          ✕
        </button>
      </div>
    </div>
  )
}
