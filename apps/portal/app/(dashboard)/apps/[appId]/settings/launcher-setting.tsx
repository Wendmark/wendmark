'use client'

import { useActionState } from 'react'
import { setLauncherAction, type FormResult } from '../../../../../actions/apps'

const initial: FormResult = {}

/**
 * Whether Wendmark adds its own button to this app.
 *
 * Off by default, and worth explaining rather than presenting as a bare
 * switch: most product owners would rather put the entry point in their own
 * help menu than have one appear in the corner of their interface.
 */
export function LauncherSetting({
  appId,
  enabled,
  canEdit,
}: {
  appId: string
  enabled: boolean
  canEdit: boolean
}) {
  const [state, action, pending] = useActionState(setLauncherAction, initial)

  return (
    <form action={action} className="form">
      <h2>The “How do I…” button</h2>
      <p className="muted">
        {enabled
          ? 'Wendmark shows its own button in the corner of your app.'
          : 'Wendmark adds nothing to your app’s interface. Call Wendmark.openLauncher() from your own help menu to open the list of processes.'}
      </p>

      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />

      {state.error ? <p role="alert">{state.error}</p> : null}

      {canEdit ? (
        <button type="submit" className="secondary" disabled={pending}>
          {enabled ? 'Turn the button off' : 'Show the button'}
        </button>
      ) : null}
    </form>
  )
}
