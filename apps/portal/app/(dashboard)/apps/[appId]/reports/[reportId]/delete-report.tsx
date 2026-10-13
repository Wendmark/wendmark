'use client'

import { useActionState, useState } from 'react'
import { deleteReportAction, type FormResult } from '../../../../../../actions/reports'

const initial: FormResult = {}

/** Deletes this report outright, after asking once. */
export function DeleteReport({ reportId }: { reportId: string }) {
  const [state, remove, removing] = useActionState(deleteReportAction, initial)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="report-delete">
      {confirming ? (
        <form action={remove} className="confirm">
          <input type="hidden" name="reportId" value={reportId} />
          <span className="muted">Delete this report? It cannot be undone.</span>
          <button type="submit" className="destructive" disabled={removing}>
            {removing ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button type="button" className="secondary" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </form>
      ) : (
        <button type="button" className="secondary" onClick={() => setConfirming(true)}>
          Delete this report
        </button>
      )}
      {state.error ? <p role="alert">{state.error}</p> : null}
    </div>
  )
}
