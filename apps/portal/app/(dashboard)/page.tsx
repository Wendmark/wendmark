import Link from 'next/link'
import { listApps } from '../../lib/apps/service'
import { requireUser } from '../../lib/auth/session'
import { can } from '../../lib/permissions'

/** The apps this organization has installed the snippet into. */
export default async function AppsPage() {
  const user = await requireUser()
  const apps = await listApps({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  })

  return (
    <section>
      <div className="row">
        <h1>Apps</h1>
        {can(user.role, 'app:create') ? (
          <Link href="/apps/new" className="button">
            Add an app
          </Link>
        ) : null}
      </div>

      {apps.length === 0 ? (
        <p className="muted">
          No apps yet. Add the app you want to document, then paste its snippet into it.
        </p>
      ) : (
        <ul className="list">
          {apps.map((app) => (
            <li key={app.id} className="card">
              <Link href={`/apps/${app.id}`}>
                <strong>{app.name}</strong>
              </Link>
              <p className="muted">{app.origins.join(', ')}</p>
              <p className="muted">
                {app.lastSeenAt
                  ? `Snippet last seen ${app.lastSeenAt.toLocaleString()}`
                  : 'Snippet not seen yet'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
