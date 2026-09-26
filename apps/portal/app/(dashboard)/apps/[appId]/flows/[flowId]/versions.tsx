'use client'

import { useActionState } from 'react'
import {
  publishFlowAction,
  restoreVersionAction,
  unpublishFlowAction,
  type FormResult,
} from '../../../../../../actions/flows'
import { describePublishState, type PublishState } from '../../../../../../lib/flows/versions'
import type { VersionSummary } from '../../../../../../lib/flows/service'

const initial: FormResult = {}

export interface VersionsProps {
  appId: string
  flowId: string
  versions: VersionSummary[]
  state: PublishState
  isDraft: boolean
  canPublish: boolean
  hasSteps: boolean
}

/**
 * What users are being served, and what was served before.
 *
 * Publishing freezes a copy, so the thing an author most needs to see is
 * whether their edits have reached anyone yet. That sentence comes first;
 * the history is underneath it.
 */
export function Versions({
  appId,
  flowId,
  versions,
  state,
  isDraft,
  canPublish,
  hasSteps,
}: VersionsProps) {
  const [publishResult, publish, publishing] = useActionState(publishFlowAction, initial)
  const [unpublishResult, unpublish, unpublishing] = useActionState(unpublishFlowAction, initial)
  const [restoreResult, restore, restoring] = useActionState(restoreVersionAction, initial)

  const error = publishResult.error ?? unpublishResult.error ?? restoreResult.error
  const busy = publishing || unpublishing || restoring

  return (
    <section className="versions">
      <h2>Publishing</h2>

      <p className={state === 'up-to-date' && !isDraft ? 'seen' : 'muted'}>
        {isDraft && versions.length > 0
          ? 'Back to a draft — users see nothing. Publishing shows it again.'
          : describePublishState(state)}
      </p>
      {error ? <p role="alert">{error}</p> : null}

      {canPublish ? (
        <div className="process-actions">
          {state !== 'up-to-date' || isDraft ? (
            <form action={publish}>
              <input type="hidden" name="appId" value={appId} />
              <input type="hidden" name="flowId" value={flowId} />
              <button type="submit" disabled={busy || !hasSteps}>
                {state === 'edited-since' ? 'Publish these changes' : 'Publish'}
              </button>
            </form>
          ) : null}

          {!isDraft ? (
            <form action={unpublish}>
              <input type="hidden" name="appId" value={appId} />
              <input type="hidden" name="flowId" value={flowId} />
              <button type="submit" className="secondary" disabled={busy}>
                Back to draft
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {!hasSteps ? (
        <p className="muted">A process needs at least one step to be published.</p>
      ) : null}

      {versions.length > 0 ? (
        <ul className="processes">
          {versions.map((version) => (
            <li key={version.id} className={`process${version.isLive ? ' status-published' : ''}`}>
              <div className="process-main">
                <strong>
                  Version {version.version}
                  {version.isLive ? ' — what users see' : ''}
                </strong>
                <p className="muted">
                  “{version.name}” · {version.steps} {version.steps === 1 ? 'step' : 'steps'} ·{' '}
                  {version.publishedAt.toLocaleString()}
                  {version.publishedBy ? ` · by ${version.publishedBy}` : ''}
                </p>
              </div>

              {canPublish && !version.isLive ? (
                <form action={restore} className="process-actions">
                  <input type="hidden" name="appId" value={appId} />
                  <input type="hidden" name="flowId" value={flowId} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <button type="submit" className="secondary" disabled={busy}>
                    Put this back
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
