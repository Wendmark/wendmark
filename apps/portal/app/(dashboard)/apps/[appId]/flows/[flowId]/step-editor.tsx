'use client'

import { useActionState, useState } from 'react'
import { editStepAction, type FormResult } from '../../../../../../actions/flows'

const initial: FormResult = {}

export interface EditableStep {
  id: string
  type: 'action' | 'input' | 'instruction'
  text: string
  /** What the step points at, in words. Empty for an instruction. */
  points: string
  dynamic: boolean
}

export interface StepEditorProps {
  appId: string
  flowId: string
  steps: EditableStep[]
  canEdit: boolean
}

/**
 * Turning a recording into something worth reading.
 *
 * The wording comes from whatever the buttons happened to be called, a
 * misclick becomes a step, and the order is whatever the author did. All of
 * that is editable here. What a step *points at* is not: that was captured
 * in the running app and cannot be reasoned about from a desk.
 */
export function StepEditor({ appId, flowId, steps, canEdit }: StepEditorProps) {
  const [state, edit, pending] = useActionState(editStepAction, initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [noteAfter, setNoteAfter] = useState<string | null>(null)

  if (!canEdit) {
    return (
      <ol className="steps">
        {steps.map((step) => (
          <li key={step.id}>
            <strong>{step.text}</strong>
            <p className="muted">{step.points || 'Something to read'}</p>
          </li>
        ))}
      </ol>
    )
  }

  /** The hidden fields every one of these forms needs. */
  const keys = (stepId: string, what: string) => (
    <>
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="flowId" value={flowId} />
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="what" value={what} />
    </>
  )

  return (
    <div>
      {state.error ? <p role="alert">{state.error}</p> : null}

      <ol className="steps editable">
        {steps.map((step, index) => (
          <li key={step.id}>
            {editing === step.id ? (
              <form action={edit} className="step-edit" onSubmit={() => setEditing(null)}>
                {keys(step.id, 'retitle')}
                <input
                  name="text"
                  defaultValue={step.text}
                  autoFocus
                  aria-label="What this step says"
                />
                <button type="submit" disabled={pending}>
                  Save
                </button>
                <button type="button" className="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <div className="step-row">
                <div className="step-main">
                  <strong>{step.text}</strong>
                  <p className="muted">
                    {step.points || 'Something to read'}
                    {step.dynamic ? ' · their own data' : ''}
                  </p>
                </div>

                <div className="step-actions">
                  <button type="button" className="secondary" onClick={() => setEditing(step.id)}>
                    Reword
                  </button>

                  {step.type === 'action' ? (
                    <form action={edit}>
                      {keys(step.id, 'dynamic')}
                      <input type="hidden" name="dynamic" value={step.dynamic ? 'false' : 'true'} />
                      <button
                        type="submit"
                        className="secondary"
                        disabled={pending}
                        title="Their own data: ring every similar element and let the user choose"
                      >
                        {step.dynamic ? 'Fixed part of the app' : 'Their own data'}
                      </button>
                    </form>
                  ) : null}

                  <form action={edit}>
                    {keys(step.id, 'up')}
                    <button type="submit" className="secondary" disabled={pending || index === 0}>
                      ↑
                    </button>
                  </form>
                  <form action={edit}>
                    {keys(step.id, 'down')}
                    <button
                      type="submit"
                      className="secondary"
                      disabled={pending || index === steps.length - 1}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={edit}>
                    {keys(step.id, 'remove')}
                    <button
                      type="submit"
                      className="secondary"
                      disabled={pending || steps.length === 1}
                      title={
                        steps.length === 1
                          ? 'A process needs at least one step'
                          : 'Remove this step'
                      }
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            )}

            {noteAfter === step.id ? (
              <form action={edit} className="step-edit" onSubmit={() => setNoteAfter(null)}>
                {keys(step.id, 'note')}
                <input
                  name="text"
                  placeholder="What should the user read here?"
                  autoFocus
                  aria-label="Something for the user to read"
                />
                <button type="submit" disabled={pending}>
                  Add
                </button>
                <button type="button" className="secondary" onClick={() => setNoteAfter(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" className="add-note" onClick={() => setNoteAfter(step.id)}>
                + Add something to read here
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
