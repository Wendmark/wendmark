'use client'

import { useActionState } from 'react'
import { allowOriginAction, type FormResult } from '../../../../actions/apps'

const initial: FormResult = {}

/**
 * Addresses that used this app's key but are not on its allowlist — usually
 * a staging environment nobody remembered to add. Better to offer to add
 * them than to leave someone wondering why guidance never appears.
 */
export function UnknownOrigins({
  appId,
  origins,
  canAdd,
}: {
  appId: string
  origins: { origin: string; count: number }[]
  canAdd: boolean
}) {
  const [state, action, pending] = useActionState(allowOriginAction, initial)

  return (
    <div className="notice-box">
      <h3>Seen from addresses that are not on the list</h3>
      <ul className="plain">
        {origins.map(({ origin, count }) => (
          <li key={origin} className="row">
            <code>{origin}</code>
            <span className="muted">
              {count} {count === 1 ? 'time' : 'times'}
            </span>
            {canAdd ? (
              <form action={action}>
                <input type="hidden" name="appId" value={appId} />
                <input type="hidden" name="origin" value={origin} />
                <button type="submit" className="secondary" disabled={pending}>
                  Add
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </div>
  )
}
