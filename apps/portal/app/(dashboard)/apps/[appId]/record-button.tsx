'use client'

import { useRef, useState } from 'react'
import { startAuthoring } from '../../../../actions/authoring'

/** Messages exchanged with the snippet in the customer's app. */
const HELLO = 'wendmark:author:hello'
const TOKEN = 'wendmark:author:token'

/** How long to wait for the snippet to say hello before giving up. */
const HANDSHAKE_TIMEOUT_MS = 20_000

type Status = 'idle' | 'opening' | 'waiting' | 'handed-over' | 'failed'

/**
 * Sends the author into their own app to record.
 *
 * Opens the app in a new tab with a hint in the address — not a secret — then
 * waits for the snippet there to ask for credentials, and replies to that tab
 * alone. Nothing sensitive is ever in the URL.
 */
export function RecordButton({ appId, origins }: { appId: string; origins: string[] }) {
  const [origin, setOrigin] = useState(origins[0] ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function record(): Promise<void> {
    setError(null)
    setStatus('opening')

    const permission = await startAuthoring(appId, origin)
    if (!permission.ok) {
      setError(permission.error)
      setStatus('failed')
      return
    }

    // Plain values, so the closures below keep their types.
    const token = permission.token
    const appOrigin = permission.origin

    const target = window.open(`${appOrigin}/#wm=author`, '_blank')
    if (!target) {
      setError('Your browser blocked the new tab. Allow pop-ups for the portal and try again.')
      setStatus('failed')
      return
    }

    setStatus('waiting')

    function onMessage(event: MessageEvent): void {
      if (event.origin !== appOrigin) return
      if ((event.data as { type?: string } | null)?.type !== HELLO) return

      target?.postMessage({ type: TOKEN, token }, appOrigin)
      cleanUp()
      setStatus('handed-over')
    }

    function cleanUp(): void {
      window.removeEventListener('message', onMessage)
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }

    window.addEventListener('message', onMessage)
    timer.current = setTimeout(() => {
      cleanUp()
      setStatus('failed')
      setError('The snippet did not answer. Check it is installed on that address, then try again.')
    }, HANDSHAKE_TIMEOUT_MS)
  }

  return (
    <div className="record">
      {origins.length > 1 ? (
        <label>
          Record on
          <select value={origin} onChange={(event) => setOrigin(event.target.value)}>
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
      {status === 'handed-over' ? (
        <p className="seen">✓ Recording started in the other tab.</p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
