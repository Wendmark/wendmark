'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import {
  deleteFlowAction,
  duplicateFlowAction,
  pauseFlowAction,
  publishFlowAction,
  type FormResult,
} from '../../../../actions/flows'
import { canPause, canResume, describeStatus } from '../../../../lib/flows/list'
import type { FlowSummary } from '../../../../lib/flows/service'

const initial: FormResult = {}

export interface ProcessesProps {
  appId: string
  flows: FlowSummary[]
  canEdit: boolean
  canPublish: boolean
  canDelete: boolean
}

/**
 * Everything recorded for this app.
 *
 * The operational view: what exists, whether users can see it, and the few
 * things worth doing to it from here. Editing what a process says is its
 * own screen.
 */
export function Processes({ appId, flows, canEdit, canPublish, canDelete }: ProcessesProps) {
  const [pauseState, pause, pausing] = useActionState(pauseFlowAction, initial)
  const [copyState, duplicate, copying] = useActionState(duplicateFlowAction, initial)
  const [deleteState, remove, removing] = useActionState(deleteFlowAction, initial)
  const [publishState, publish, publishing] = useActionState(publishFlowAction, initial)
  const [confirming, setConfirming] = useState<string | null>(null)

  const error = pauseState.error ?? copyState.error ?? deleteState.error ?? publishState.error

  if (flows.length === 0) {
    return (
      <p className="muted">
        No processes yet. Record one in your app and it will appear here as a draft.
      </p>
    )
  }

  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}

      <ul className="processes">
        {flows.map((flow) => (
          <li key={flow.id} className={`process status-${flow.status}`}>
            <div className="process-main">
              <Link href={`/apps/${appId}/flows/${flow.id}`}>{flow.name}</Link>
              <p className="muted">
                {flow.steps} {flow.steps === 1 ? 'step' : 'steps'} · {describeStatus(flow.status)} ·
                edited {flow.updatedAt.toLocaleDateString()}
                {flow.recordedBy ? ` · recorded by ${flow.recordedBy}` : ''}
              </p>
            </div>

            <div className="process-actions">
              {canPublish && flow.needsPublish ? (
                <form action={publish}>
                  <input type="hidden" name="appId" value={appId} />
                  <input type="hidden" name="flowId" value={flow.id} />
                  <button type="submit" disabled={publishing || flow.steps === 0}>
                    Publish
                  </button>
                </form>
              ) : null}

              {canPublish && canPause(flow.status) ? (
                <form action={pause}>
                  <input type="hidden" name="appId" value={appId} />
                  <input type="hidden" name="flowId" value={flow.id} />
                  <input type="hidden" name="paused" value="true" />
                  <button type="submit" className="secondary" disabled={pausing}>
                    Pause
                  </button>
                </form>
              ) : null}

              {canPublish && canResume(flow.status) ? (
                <form action={pause}>
                  <input type="hidden" name="appId" value={appId} />
                  <input type="hidden" name="flowId" value={flow.id} />
                  <input type="hidden" name="paused" value="false" />
                  <button type="submit" className="secondary" disabled={pausing}>
                    Show again
                  </button>
                </form>
              ) : null}

              {canEdit ? (
                <form action={duplicate}>
                  <input type="hidden" name="appId" value={appId} />
                  <input type="hidden" name="flowId" value={flow.id} />
                  <button type="submit" className="secondary" disabled={copying}>
                    Duplicate
                  </button>
                </form>
              ) : null}

              {canDelete && confirming !== flow.id ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConfirming(flow.id)}
                  disabled={removing}
                >
                  Delete
                </button>
              ) : null}

              {canDelete && confirming === flow.id ? (
                <form action={remove} className="confirm">
                  <input type="hidden" name="appId" value={appId} />
                  <input type="hidden" name="flowId" value={flow.id} />
                  <span className="muted">Delete “{flow.name}”?</span>
                  <button type="submit" className="destructive" disabled={removing}>
                    {removing ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button type="button" className="secondary" onClick={() => setConfirming(null)}>
                    Keep it
                  </button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
