'use client'

import { useActionState } from 'react'
import { rotateKeyAction, updateAppAction, type FormResult } from '../../../../../actions/apps'

const initial: FormResult = {}

export function AppSettingsForm({
  appId,
  name,
  origins,
  publicKey,
  canEdit,
  canRotate,
}: {
  appId: string
  name: string
  origins: string[]
  publicKey: string
  canEdit: boolean
  canRotate: boolean
}) {
  const [state, action, pending] = useActionState(updateAppAction, initial)
  const [rotateState, rotate, rotating] = useActionState(rotateKeyAction, initial)

  return (
    <>
      <form action={action} className="form">
        <input type="hidden" name="appId" value={appId} />
        <label>
          Name
          <input name="name" defaultValue={name} required disabled={!canEdit} />
        </label>
        <label>
          Addresses, one per line
          <textarea
            name="origins"
            rows={4}
            defaultValue={origins.join('\n')}
            required
            disabled={!canEdit}
          />
        </label>
        {state.error ? <p role="alert">{state.error}</p> : null}
        {canEdit ? (
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        ) : (
          <p className="muted">Your role can view these settings but not change them.</p>
        )}
      </form>

      <h2>Key</h2>
      <p className="muted">
        This appears in the script tag. It identifies the app; it is not a secret.
      </p>
      <pre className="code">{publicKey}</pre>
      {canRotate ? (
        <form action={rotate} className="form">
          <input type="hidden" name="appId" value={appId} />
          {rotateState.error ? <p role="alert">{rotateState.error}</p> : null}
          <button type="submit" className="secondary" disabled={rotating}>
            {rotating ? 'Rotating…' : 'Rotate key'}
          </button>
          <p className="muted">
            The old key stops working immediately. Any page still using it loses guidance until the
            script tag is updated.
          </p>
        </form>
      ) : null}
    </>
  )
}
