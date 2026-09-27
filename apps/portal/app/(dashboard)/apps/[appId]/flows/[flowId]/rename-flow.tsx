'use client'

import { useActionState, useState } from 'react'
import { renameFlowAction, type FormResult } from '../../../../../../actions/flows'

const initial: FormResult = {}

/**
 * The name and the sentence under it.
 *
 * Both are what an end user reads in the launcher, and both come out of a
 * recording as whatever was typed in a hurry — "Untitled process" more often
 * than not.
 */
export function RenameFlow({
  appId,
  flowId,
  name,
  description,
  canEdit,
}: {
  appId: string
  flowId: string
  name: string
  description: string | null
  canEdit: boolean
}) {
  const [state, rename, pending] = useActionState(renameFlowAction, initial)
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div className="row">
        <h1>{name}</h1>
        {canEdit ? (
          <button type="button" className="secondary" onClick={() => setEditing(true)}>
            Rename
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <form action={rename} className="form" onSubmit={() => setEditing(false)}>
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="flowId" value={flowId} />

      <label>
        Name
        <input name="name" defaultValue={name} autoFocus />
      </label>
      <label>
        A sentence about it, shown under the name
        <input name="description" defaultValue={description ?? ''} />
      </label>

      {state.error ? <p role="alert">{state.error}</p> : null}

      <div className="process-actions">
        <button type="submit" disabled={pending}>
          Save
        </button>
        <button type="button" className="secondary" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
