'use client'

import { useActionState, useState } from 'react'
import { eraseReportsAction, type FormResult } from '../../../../../actions/reports'

const initial: FormResult = {}

/**
 * "Delete everything from this person": the answer to a data request.
 * Asks once, because it cannot be undone.
 */
export function EraseReports({
  appId,
  userRef,
  count,
}: {
  appId: string
  userRef: string
  count: number
}) {
  const [state, erase, erasing] = useActionState(eraseReportsAction, initial)
  const [confirming, setConfirming] = useState(false)
  const reports = `${count} ${count === 1 ? 'report' : 'reports'}`

  if (!confirming) {
    return (
      <button type="button" className="secondary" onClick={() => setConfirming(true)}>
        Delete all {reports} from {userRef}
      </button>
    )
  }

  return (
    <form action={erase} className="confirm">
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="userRef" value={userRef} />
      <span className="muted">
        Delete {reports} from {userRef}? This cannot be undone.
      </span>
      <button type="submit" className="destructive" disabled={erasing}>
        {erasing ? 'Deleting…' : 'Yes, delete them'}
      </button>
      <button type="button" className="secondary" onClick={() => setConfirming(false)}>
        Keep them
      </button>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  )
}
