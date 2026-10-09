'use client'

import { useActionState } from 'react'
import { setReportsAction, type FormResult } from '../../../../../actions/apps'
import { MAX_RETENTION_DAYS, MIN_RETENTION_DAYS } from '../../../../../lib/apps/settings'
import type { LabelPolicy } from '@wendmark/core'

const initial: FormResult = {}

/**
 * Whether your users may report a problem by retracing it.
 *
 * The one setting on this page that decides what gets stored rather than how
 * something looks, so it says so in plain words. A report is structure — the
 * controls somebody touched, in order — but on your customer's screen a
 * label that reads “Issue refund” for your staff reads “Order FK-10421” for
 * them. Hence the second switch, and hence off by default.
 */
export function ReportsSetting({
  appId,
  enabled,
  labels,
  retentionDays,
  canEdit,
}: {
  appId: string
  enabled: boolean
  labels: LabelPolicy
  retentionDays: number
  canEdit: boolean
}) {
  const [state, action, pending] = useActionState(setReportsAction, initial)

  return (
    <div className="reports-setting">
      <h2>Problem reports</h2>
      <p className="muted">
        {enabled
          ? 'Your users can press “Report a problem”, do the thing that failed, and send you the steps. Nothing is captured until they ask, and nothing they type is ever read.'
          : 'Off. Your users cannot report problems, and nothing about their sessions is stored.'}
      </p>

      {enabled ? (
        <form action={action} className="form">
          <input type="hidden" name="appId" value={appId} />
          <input type="hidden" name="enabled" value="true" />

          <label>
            What a report keeps
            <select name="labels" defaultValue={labels} disabled={!canEdit}>
              <option value="none">Structure only — recommended</option>
              <option value="all">Structure and the labels on the page</option>
            </select>
          </label>
          <p className="muted">
            Structure only means a report says “Press a button” where it could have said “Press
            Issue refund”. Harder to read, and it cannot contain one of your customers’ names or
            order numbers. Keep the labels only if you know your own interface never shows a
            customer anything about themselves.
          </p>

          <label>
            Delete reports after
            <input
              name="retentionDays"
              type="number"
              min={MIN_RETENTION_DAYS}
              max={MAX_RETENTION_DAYS}
              defaultValue={retentionDays}
              disabled={!canEdit}
            />{' '}
            days
          </label>
          <p className="muted">
            Deleted outright, not hidden. You are the data controller for anything your users send
            here.
          </p>

          {state.error ? <p role="alert">{state.error}</p> : null}

          {canEdit ? (
            <button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </button>
          ) : null}
        </form>
      ) : null}

      {canEdit ? (
        <form action={action}>
          <input type="hidden" name="appId" value={appId} />
          <input type="hidden" name="enabled" value={enabled ? 'false' : 'true'} />
          <button type="submit" className="secondary" disabled={pending}>
            {enabled ? 'Turn reports off' : 'Let users report problems'}
          </button>
        </form>
      ) : null}
    </div>
  )
}
