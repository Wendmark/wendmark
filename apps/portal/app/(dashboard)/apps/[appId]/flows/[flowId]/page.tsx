import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '../../../../../../lib/auth/session'
import { getApp } from '../../../../../../lib/apps/service'
import { getFlow, listVersions, publishingState } from '../../../../../../lib/flows/service'
import { describeStatus, stepCount } from '../../../../../../lib/flows/list'
import { can } from '../../../../../../lib/permissions'
import { Versions } from './versions'
import { RenameFlow } from './rename-flow'
import { StepEditor, type EditableStep } from './step-editor'
import { FlowSchema, type Step } from '@wendmark/core'

/**
 * One process: what it says, in what order, and whether users can see it.
 *
 * A recording is a rough draft — the wording comes from whatever the buttons
 * were called, and a misclick is a step like any other. This is where that
 * becomes something worth showing somebody. What each step points at is not
 * editable here: that was captured in the running app.
 */
export default async function FlowPage({
  params,
}: {
  params: Promise<{ appId: string; flowId: string }>
}) {
  const { appId, flowId } = await params
  const user = await requireUser()
  const ctx = { userId: user.id, organizationId: user.organizationId, role: user.role }

  const app = await getApp(ctx, appId)
  const flow = await getFlow(ctx, flowId)
  if (!app || !flow || flow.appId !== app.id) notFound()

  const steps = readSteps(flow.steps)
  const recordedBy = flow.createdBy?.name ?? flow.createdBy?.email ?? null
  const versions = await listVersions(ctx, flow.id)
  const state = await publishingState(ctx, flow.id)

  return (
    <section>
      <div className="row">
        <RenameFlow
          appId={app.id}
          flowId={flow.id}
          name={flow.name}
          description={flow.description}
          canEdit={can(user.role, 'flow:update')}
        />
        <Link href={`/apps/${app.id}`} className="button secondary">
          Back to {app.name}
        </Link>
      </div>

      <p className="muted">
        {describeStatus(flow.status)} · edited {flow.updatedAt.toLocaleString()}
        {recordedBy ? ` · recorded by ${recordedBy}` : ''}
      </p>
      {flow.description ? <p>{flow.description}</p> : null}

      {steps === null ? (
        <p role="alert">
          These steps were not written in a format this portal understands. It was recorded by a
          newer snippet, or edited by hand.
        </p>
      ) : (
        <StepEditor
          appId={app.id}
          flowId={flow.id}
          steps={steps.map(toEditable)}
          canEdit={can(user.role, 'flow:update')}
        />
      )}

      <Versions
        appId={app.id}
        flowId={flow.id}
        versions={versions}
        state={state}
        isDraft={flow.status === 'draft'}
        canPublish={can(user.role, 'flow:publish')}
        hasSteps={stepCount(flow.steps) > 0}
      />
    </section>
  )
}

/** The stored steps, or null if the column holds something else. */
function readSteps(steps: unknown): Step[] | null {
  const parsed = FlowSchema.shape.steps.safeParse(steps)
  return parsed.success ? parsed.data : null
}

/** A step in the shape the editor needs, with no schema types crossing over. */
function toEditable(step: Step): EditableStep {
  return {
    id: step.id,
    type: step.type,
    text: step.text,
    points: describeStep(step),
    dynamic: step.type === 'action' && step.dynamic,
  }
}

/** What the user has to do, and what they have to do it to. */
function describeStep(step: Step): string {
  if (step.type === 'instruction') return 'Something to read — no click needed'

  const what = step.type === 'input' ? 'Types into' : 'Clicks'
  const target = step.target.name || step.target.text || step.target.selectors[0] || 'an element'
  const where = step.target.context ? ` in ${step.target.context}` : ''

  return `${what} ${target}${where}`
}
