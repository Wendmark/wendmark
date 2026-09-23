import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getApp, listUnknownOrigins } from '../../../../lib/apps/service'
import { requireUser } from '../../../../lib/auth/session'
import { can } from '../../../../lib/permissions'
import { UnknownOrigins } from './unknown-origins'

/** What a single app looks like: how to install it, and what it holds. */
export default async function AppPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const user = await requireUser()
  const ctx = { userId: user.id, organizationId: user.organizationId, role: user.role }
  const app = await getApp(ctx, appId)
  if (!app) notFound()

  const unknownOrigins = await listUnknownOrigins(ctx, app.id)

  return (
    <section>
      <div className="row">
        <h1>{app.name}</h1>
        <Link href={`/apps/${app.id}/settings`} className="button secondary">
          Settings
        </Link>
      </div>

      <h2>Install</h2>
      <p className="muted">Paste this into the app, just before the closing body tag.</p>
      <pre className="code">{`<script src="http://localhost:3100/snippet.js" data-app="${app.publicKey}"></script>`}</pre>

      <p className={app.lastSeenAt ? 'seen' : 'muted'}>
        {app.lastSeenAt
          ? `✓ Snippet seen on ${app.lastSeenOrigin ?? 'an unknown address'}, ${app.lastSeenAt.toLocaleString()}.`
          : 'Waiting to see the snippet. Load a page of your app once it is installed.'}
      </p>

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

      <h2>Processes</h2>
      <p className="muted">Recording processes comes next.</p>
    </section>
  )
}
