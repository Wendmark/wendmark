'use client'

import { useState } from 'react'
import { approveWaitingRecorder } from '../../../../actions/authoring'

/** How long to keep waiting for the app to ask, and how often to check. */
const WAIT_TIMEOUT_MS = 45_000
const CHECK_INTERVAL_MS = 1_000

type Status = 'idle' | 'waiting' | 'recording' | 'failed'

/**
 * Sends the author into their own app to record.
 *
 * Opens the app in a new tab with a hint in the address — no secret — and
 * waits for the snippet there to ask permission. This click is the approval;
 * the portal grants it when the request arrives. Nothing is passed between
 * windows, which is what makes this work on apps that set
 * Cross-Origin-Opener-Policy.
 */
export function RecordButton({ appId, origins }: { appId: string; origins: string[] }) {
  const [origin, setOrigin] = useState(origins[0] ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function record(): Promise<void> {
    setError(null)

    const target = window.open(`${origin}/#wm=author`, '_blank')
    if (!target) {
      setError('Your browser blocked the new tab. Allow pop-ups for the portal and try again.')
      setStatus('failed')
      return
    }

    setStatus('waiting')
    const until = Date.now() + WAIT_TIMEOUT_MS

    while (Date.now() < until) {
      const result = await approveWaitingRecorder(appId, origin)

      if (result.status === 'approved') {
        setStatus('recording')
        return
      }
      if (result.status === 'error') {
        setError(result.error)
        setStatus('failed')
        return
      }
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS))
    }

    setStatus('failed')
    setError(
      'Your app never asked to record. Check the snippet is installed on that address, and that you are signed into it.',
    )
  }

  return (
    <div className="record">
      {origins.length > 1 ? (
        <label>
          Record on
          <select
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            disabled={status === 'waiting'}
          >
            {origins.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button type="button" onClick={() => void record()} disabled={status === 'waiting'}>
        {status === 'waiting' ? 'Waiting for your app…' : 'Record a process'}
      </button>

      {status === 'waiting' ? (
        <p className="muted">
          Your app opened in a new tab. Sign in there if you need to, and the recorder will appear.
        </p>
      ) : null}
      {status === 'recording' ? (
        <p className="seen">✓ Recording in the other tab. Come back here when you are done.</p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
