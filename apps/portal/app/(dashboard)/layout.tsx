import type { ReactNode } from 'react'
import { listApps } from '../../lib/apps/service'
import { requireUser } from '../../lib/auth/session'
import { can } from '../../lib/permissions'
import { Sidebar } from './sidebar'
import { SignOutButton } from './sign-out-button'

/** Everything inside this group requires a signed-in user. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const apps = await listApps({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  })

  return (
    <div className="shell">
      <Sidebar
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          installed: app.lastSeenAt !== null,
        }))}
        email={user.email}
        canAddApp={can(user.role, 'app:create')}
        signOut={<SignOutButton />}
      />
      <main className="content">{children}</main>
    </div>
  )
}
