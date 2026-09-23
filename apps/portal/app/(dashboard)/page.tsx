import { requireUser } from '../../lib/auth/session'

/** Placeholder home: the apps list lands here next. */
export default async function HomePage() {
  const user = await requireUser()

  return (
    <section>
      <h1>Apps</h1>
      <p className="muted">
        Signed in as {user.name ?? user.email}
        {user.role ? ` · ${user.role}` : ''}
      </p>
      <p>No apps yet. Adding one comes next.</p>
    </section>
  )
}
