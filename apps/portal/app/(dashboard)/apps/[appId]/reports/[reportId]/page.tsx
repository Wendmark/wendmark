import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApp } from '../../../../../../lib/apps/service'
import { requireUser } from '../../../../../../lib/auth/session'
import { can } from '../../../../../../lib/permissions'
import { getReport } from '../../../../../../lib/reports/read'
import {
  describeLabels,
  pageTrail,
  readSteps,
  replayStart,
  viewStep,
} from '../../../../../../lib/reports/view'
import { DeleteReport } from './delete-report'
import { ReplayButton } from './replay-button'

/**
 * One report: what the person said went wrong, and what they did.
 *
 * The steps are shown as they were stored, which under the default policy
 * means masked: "Press a button", on which page, and how the control can be
 * found again. That is the report a support person reads; the words on the
 * customer's screen were never kept.
 */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ appId: string; reportId: string }>
}) {
  const { appId, reportId } = await params
  const user = await requireUser()
  const ctx = { userId: user.id, organizationId: user.organizationId, role: user.role }

  const app = await getApp(ctx, appId)
  if (!app || !can(user.role, 'report:read')) notFound()
  const report = await getReport(ctx, reportId)
  if (!report || report.appId !== app.id) notFound()

  const steps = readSteps(report.stepsJson).map(viewStep)
  const start = replayStart(report, app.origins)

  return (
    <section>
      <div className="row">
        <h1>Problem report</h1>
        <Link href={`/apps/${app.id}/reports`} className="button secondary">
          All reports
        </Link>
      </div>

      <blockquote className="report-note">{report.note}</blockquote>

      <dl className="report-meta">
        <dt>Received</dt>
        <dd>
          {report.createdAt.toLocaleString()}, from {report.origin}
        </dd>
        <dt>Pages</dt>
        <dd>{pageTrail(report.pages)}</dd>
        {report.userRef ? (
          <>
            <dt>Sent by</dt>
            <dd>
              {report.userRef} ·{' '}
              <Link href={`/apps/${app.id}/reports?user=${encodeURIComponent(report.userRef)}`}>
                everything they sent
              </Link>
            </dd>
          </>
        ) : null}
        <dt>Kept</dt>
        <dd>
          {describeLabels(report.labels)} Deleted on {report.expiresAt.toLocaleDateString()}.
        </dd>
        {report.userAgent ? (
          <>
            <dt>Browser</dt>
            <dd className="muted">{report.userAgent}</dd>
          </>
        ) : null}
      </dl>

      <h2>
        What they did <span className="count">{steps.length}</span>
      </h2>
      {steps.length > 0 ? (
        <ReplayButton reportId={report.id} origins={start.origins} path={start.path} />
      ) : null}
      <ol className="report-steps">
        {steps.map((step, index) => (
          <li key={index}>
            <div className="report-step">
              <strong>{step.text}</strong>
              <p className="muted">
                {[step.page, step.role, step.ownData ? 'their own data' : null]
                  .filter(Boolean)
                  .join(' · ') || 'Something to read'}
              </p>
              {step.selectors.length > 0 ? (
                <details>
                  <summary className="muted">How it is found</summary>
                  <pre className="code">{step.selectors.join('\n')}</pre>
                </details>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {can(user.role, 'report:delete') ? <DeleteReport reportId={report.id} /> : null}
    </section>
  )
}
