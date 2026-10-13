import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApp } from '../../../../../lib/apps/service'
import { readAppSettings } from '../../../../../lib/apps/settings'
import { requireUser } from '../../../../../lib/auth/session'
import { can } from '../../../../../lib/permissions'
import { listReports } from '../../../../../lib/reports/read'
import { headline, pageTrail } from '../../../../../lib/reports/view'
import { EraseReports } from './erase-reports'

/**
 * What an app's users have reported.
 *
 * The only page in the portal that lists an app's own customers' words, so
 * it shows as little as it can and still be useful: the first line of each
 * note, how many steps, which pages, and when it will be deleted. The rest
 * is one click away, on the report's own page.
 */
export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ appId: string }>
  searchParams: Promise<{ user?: string | string[] }>
}) {
  const { appId } = await params
  const { user: rawUser } = await searchParams
  const userRef = typeof rawUser === 'string' && rawUser.trim() !== '' ? rawUser.trim() : null

  const user = await requireUser()
  const ctx = { userId: user.id, organizationId: user.organizationId, role: user.role }
  const app = await getApp(ctx, appId)
  if (!app) notFound()

  if (!can(user.role, 'report:read')) {
    return (
      <section>
        <h1>Problem reports</h1>
        <p className="muted">Your role does not include reading problem reports.</p>
      </section>
    )
  }

  const settings = readAppSettings(app.settings)
  const reports = await listReports(ctx, app.id, userRef ? { userRef } : {})

  return (
    <section>
      <div className="row">
        <h1>Problem reports</h1>
        <Link href={`/apps/${app.id}`} className="button secondary">
          Back to {app.name}
        </Link>
      </div>

      {userRef ? (
        <div className="report-filter">
          <p>
            Reports from <strong>{userRef}</strong>.{' '}
            <Link href={`/apps/${app.id}/reports`}>Show everyone&apos;s</Link>
          </p>
          {can(user.role, 'report:erase-person') && reports.length > 0 ? (
            <EraseReports appId={app.id} userRef={userRef} count={reports.length} />
          ) : null}
        </div>
      ) : (
        <p className="muted">
          {settings.reports
            ? `What your users sent with “Report a problem”, newest first. Each is deleted ${settings.reportRetentionDays} days after it arrived.`
            : 'Reports are off for this app, so nothing new can arrive. Turn them on in Settings.'}
        </p>
      )}

      {reports.length === 0 ? (
        <p className="muted">
          {userRef ? 'Nothing from this person.' : 'No reports yet.'}
          {!settings.reports && !userRef ? (
            <>
              {' '}
              <Link href={`/apps/${app.id}/settings`}>Settings</Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="processes">
          {reports.map((report) => (
            <li key={report.id} className="process">
              <div className="process-main">
                <Link href={`/apps/${app.id}/reports/${report.id}`}>{headline(report.note)}</Link>
                <p className="muted">
                  {report.steps} {report.steps === 1 ? 'step' : 'steps'} · {pageTrail(report.pages)}{' '}
                  · {report.createdAt.toLocaleString()}
                  {report.userRef ? ` · from ${report.userRef}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
