'use client'

import { useActionState } from 'react'
import { deleteAppAction, type FormResult } from '../../../../../actions/apps'

const initial: FormResult = {}

/** Deleting an app takes every process recorded for it, so ask properly. */
export function DangerZone({ appId, name }: { appId: string; name: string }) {
  const [state, action, pending] = useActionState(deleteAppAction, initial)

  return (
    <form action={action} className="form danger">
      <h2>Delete this app</h2>
      <p className="muted">
        This removes the app and every process recorded for it. It cannot be undone.
      </p>
      <input type="hidden" name="appId" value={appId} />
      <label>
        Type <strong>{name}</strong> to confirm
        <input name="confirmation" autoComplete="off" />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit" className="destructive" disabled={pending}>
        {pending ? 'Deleting…' : 'Delete app'}
      </button>
    </form>
  )
}
