import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApp, listUnknownOrigins } from '../../../../lib/apps/service'
import { requireUser } from '../../../../lib/auth/session'
import { can } from '../../../../lib/permissions'
import { listFlows } from '../../../../lib/flows/service'
import { countReports } from '../../../../lib/reports/read'
import { Processes } from './processes'
import { RecordButton } from './record-button'
import { UnknownOrigins } from './unknown-origins'

/** What a single app looks like: how to install it, and what it holds. */
export default async function AppPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const user = await requireUser()
  const ctx = { userId: user.id, organizationId: user.organizationId, role: user.role }
  const app = await getApp(ctx, appId)
  if (!app) notFound()

  const unknownOrigins = await listUnknownOrigins(ctx, app.id)
  const flows = await listFlows(ctx, app.id)
  const reports = can(user.role, 'report:read') ? await countReports(ctx, app.id) : null
  const snippetTag = `<script src="http://localhost:3100/snippet.js" data-app="${app.publicKey}"></script>`

  return (
    <section>
      <div className="row">
        <h1>{app.name}</h1>
        <div className="header-links">
          {reports !== null ? (
            <Link href={`/apps/${app.id}/reports`} className="button secondary">
              Reports{reports > 0 ? <span className="count">{reports}</span> : null}
            </Link>
          ) : null}
          <Link href={`/apps/${app.id}/settings`} className="button secondary">
            Settings
          </Link>
        </div>
      </div>

      {/* Installing is a one-off. Once the snippet has been seen, the tag
          folds away: this page is about processes from then on. */}
      {app.lastSeenAt ? (
        <details className="install done">
          <summary>
            <span className="seen">Snippet installed</span>
            <span className="muted">
              last seen on {app.lastSeenOrigin ?? 'an unknown address'},{' '}
              {app.lastSeenAt.toLocaleString()}
            </span>
          </summary>
          <pre className="code">{snippetTag}</pre>
        </details>
      ) : (
        <div className="install">
          <h2>Install</h2>
          <p className="muted">Paste this into the app, just before the closing body tag.</p>
          <pre className="code">{snippetTag}</pre>
          <p className="muted">Waiting to see the snippet. Load a page of your app once it is.</p>
        </div>
      )}

      {unknownOrigins.length > 0 ? (
        <UnknownOrigins
          appId={app.id}
          origins={unknownOrigins.map((sighting) => ({
            origin: sighting.origin,
            count: sighting.count,
          }))}
          canAdd={can(user.role, 'app:update')}
        />
      ) : null}

      <div className="row section-head">
        <h2>
          Processes
          {flows.length > 0 ? <span className="count">{flows.length}</span> : null}
        </h2>
        {can(user.role, 'flow:create') ? (
          <RecordButton appId={app.id} origins={app.origins} />
        ) : (
          <p className="muted">Your role can view processes but not record them.</p>
        )}
      </div>

      <Processes
        appId={app.id}
        flows={flows}
        canEdit={can(user.role, 'flow:create')}
        canPublish={can(user.role, 'flow:publish')}
        canDelete={can(user.role, 'flow:delete')}
      />
    </section>
  )
}
