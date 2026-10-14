'use client'

import { useState } from 'react'
import { approveWaitingReplayAction } from '../../../../../../actions/reports'

/** How long to keep waiting for the app to ask, and how often to check. */
const WAIT_TIMEOUT_MS = 45_000
const CHECK_INTERVAL_MS = 1_000

type Status = 'idle' | 'waiting' | 'replaying' | 'failed'

/**
 * Replays a report in the app it came from, with the teaching cursor.
 *
 * Works like Record a process: the app opens in a new tab with a hint in
 * the address and nothing secret, the snippet there asks to replay, and
 * this click is the approval — for this one report, and only to read it.
 * Whoever replays does the clicking; Wendmark points.
 */
export function ReplayButton({
  reportId,
  origins,
  path,
}: {
  reportId: string
  origins: string[]
  path: string
}) {
  const [origin, setOrigin] = useState(origins[0] ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function replay(): Promise<void> {
    setError(null)

    const target = window.open(`${origin}${path}#wm=replay`, '_blank')
    if (!target) {
      setError('Your browser blocked the new tab. Allow pop-ups for the portal and try again.')
      setStatus('failed')
      return
    }

    setStatus('waiting')
    const until = Date.now() + WAIT_TIMEOUT_MS

    while (Date.now() < until) {
      const result = await approveWaitingReplayAction(reportId, origin)

      if (result.status === 'approved') {
        setStatus('replaying')
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
      'Your app never asked to replay. Check the snippet is installed on that address, and that you are signed into it.',
    )
  }

  if (origins.length === 0) {
    return <p className="muted">Add an address to this app to replay its reports.</p>
  }

  return (
    <div className="record">
      {origins.length > 1 ? (
        <label>
          Replay on
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

      <button type="button" onClick={() => void replay()} disabled={status === 'waiting'}>
        {status === 'waiting' ? 'Waiting for your app…' : 'Replay in the app'}
      </button>

      {status === 'idle' ? (
        <p className="muted">
          Opens the app and points at each step they took. You do the clicking, in your own account,
          so what you see may differ from theirs.
        </p>
      ) : null}
      {status === 'waiting' ? (
        <p className="muted">
          Your app opened in a new tab. Sign in there if you need to, and the replay will start.
        </p>
      ) : null}
      {status === 'replaying' ? <p className="seen">✓ Replaying in the other tab.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
