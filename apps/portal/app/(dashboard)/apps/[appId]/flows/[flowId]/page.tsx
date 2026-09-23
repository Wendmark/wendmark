import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '../../../../../../lib/auth/session'
import { getApp } from '../../../../../../lib/apps/service'
import { getFlow } from '../../../../../../lib/flows/service'
import { describeStatus } from '../../../../../../lib/flows/list'
import { FlowSchema, type Step } from '@wendmark/core'

/**
 * One process, as it was recorded.
 *
 * Read only for now: changing what a step says is the editor, which comes
 * next. What this answers is "did the recording capture the right things?",
 * which is the first thing anyone asks after saving one.
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

  return (
    <section>
      <div className="row">
        <h1>{flow.name}</h1>
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
        <ol className="steps">
          {steps.map((step) => (
            <li key={step.id}>
              <strong>{step.text}</strong>
              <p className="muted">{describeStep(step)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** The stored steps, or null if the column holds something else. */
function readSteps(steps: unknown): Step[] | null {
  const parsed = FlowSchema.shape.steps.safeParse(steps)
  return parsed.success ? parsed.data : null
}

/** What the user has to do, and what they have to do it to. */
function describeStep(step: Step): string {
  if (step.type === 'instruction') return 'Something to read — no click needed'

  const what = step.type === 'input' ? 'Types into' : 'Clicks'
  const target = step.target.name || step.target.text || step.target.selectors[0] || 'an element'
  const where = step.target.context ? ` in ${step.target.context}` : ''
  const dynamic = step.type === 'action' && step.dynamic ? ' · their own data' : ''

  return `${what} ${target}${where}${dynamic}`
}
