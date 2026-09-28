'use client'

import { useActionState } from 'react'
import { setTargetingAction, type FormResult } from '../../../../../../actions/flows'

const initial: FormResult = {}

/**
 * Where a process offers itself, and whether it offers itself at all.
 *
 * Both answers are about the launcher's list. Neither is a permission:
 * anything published plays when an app asks for it by id, which is how a
 * hidden process is meant to be used.
 */
export function Targeting({
  appId,
  flowId,
  patterns,
  listed,
  canEdit,
}: {
  appId: string
  flowId: string
  patterns: string[]
  listed: boolean
  canEdit: boolean
}) {
  const [state, save, pending] = useActionState(setTargetingAction, initial)

  if (!canEdit) {
    return (
      <section className="versions">
        <h2>Where it appears</h2>
        <p className="muted">
          {patterns.length === 0 ? 'On every page of the app.' : `On ${patterns.join(', ')}.`}{' '}
          {listed ? 'Offered in the launcher.' : 'Not offered in the launcher.'}
        </p>
      </section>
    )
  }

  return (
    <section className="versions">
      <h2>Where it appears</h2>

      <form action={save} className="form">
        <input type="hidden" name="appId" value={appId} />
        <input type="hidden" name="flowId" value={flowId} />

        <label>
          Pages, one per line. Leave empty for every page.
          <textarea name="patterns" rows={4} defaultValue={patterns.join('\n')} />
        </label>
        <p className="muted">
          A path, never a full address, so the same process works on staging and in production.{' '}
          <code>/orders</code> is that page alone, <code>/orders/*</code> is one level below it, and{' '}
          <code>/orders/**</code> is everything below it.
        </p>

        <label className="checkbox">
          <input type="checkbox" name="listed" defaultChecked={listed} />
          Offer it in the “How do I…” launcher
        </label>
        <p className="muted">
          Unticked, it is not listed but still plays when your app asks for it by id — for a process
          you link to yourself, at the moment it is relevant.
        </p>

        {state.error ? <p role="alert">{state.error}</p> : null}

        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save where it appears'}
        </button>
      </form>
    </section>
  )
}
