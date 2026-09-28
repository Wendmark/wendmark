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
  label,
  canEdit,
}: {
  appId: string
  enabled: boolean
  label: string
  canEdit: boolean
}) {
  const [state, action, pending] = useActionState(setLauncherAction, initial)

  return (
    <div className="launcher-setting">
      <h2>The guidance button</h2>
      <p className="muted">
        {enabled
          ? `Wendmark shows a “${label}” button in the corner of your app.`
          : 'Wendmark adds nothing to your app’s interface. Call Wendmark.openLauncher() from your own help menu to open the list of processes.'}
      </p>

      <form action={action} className="form">
        <input type="hidden" name="appId" value={appId} />
        <input type="hidden" name="enabled" value={enabled ? 'true' : 'false'} />

        <label>
          What to call it
          <input name="label" defaultValue={label} maxLength={40} disabled={!canEdit} />
        </label>
        <p className="muted">
          Your users read this, so it should sound like your product. Empty falls back to “How do
          I…”.
        </p>

        {state.error ? <p role="alert">{state.error}</p> : null}

        {canEdit ? (
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save the name'}
          </button>
        ) : null}
      </form>

      {canEdit ? (
        <form action={action}>
          <input type="hidden" name="appId" value={appId} />
          <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
          <button type="submit" className="secondary" disabled={pending}>
            {enabled ? 'Turn the button off' : 'Show the button'}
          </button>
        </form>
      ) : null}
    </div>
  )
}
