import type { ReactNode } from 'react'
import { requireUser } from '../../lib/auth/session'
import { SignOutButton } from './sign-out-button'

/** Everything inside this group requires a signed-in user. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Wendmark</span>
        <span className="spacer" />
        <span className="muted">{user.email}</span>
        <SignOutButton />
      </header>
      <main className="content">{children}</main>
    </div>
  )
}
