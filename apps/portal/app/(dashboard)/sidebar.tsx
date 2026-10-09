'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Wordmark } from '../wordmark'

export interface SidebarApp {
  id: string
  name: string
  installed: boolean
}

/**
 * The portal's one piece of permanent furniture.
 *
 * Everything here is somewhere to go, so it is a nav: the apps this
 * organization documents, and the account at the bottom. Which app you are
 * looking at is the portal's main axis, so it stays in view rather than
 * being something you navigate back to.
 */
export function Sidebar({
  apps,
  email,
  canAddApp,
  signOut,
}: {
  apps: SidebarApp[]
  email: string
  canAddApp: boolean
  signOut: ReactNode
}) {
  const pathname = usePathname()

  return (
    <nav className="sidebar" aria-label="Portal">
      <Link href="/" className="brand" aria-label="Wendmark, home">
        <Wordmark height={22} />
      </Link>

      <div className="side-section">
        <h2 className="side-heading">Apps</h2>
        {apps.length === 0 ? (
          <p className="side-empty">Nothing here yet.</p>
        ) : (
          <ul className="side-list">
            {apps.map((app) => {
              const href = `/apps/${app.id}`
              const current = pathname === href || pathname.startsWith(`${href}/`)

              return (
                <li key={app.id}>
                  <Link
                    href={href}
                    className={current ? 'side-link is-current' : 'side-link'}
                    aria-current={current ? 'page' : undefined}
                  >
                    <span
                      className={app.installed ? 'dot is-live' : 'dot'}
                      // The name already says which app; the dot only repeats
                      // what the app's own page says in words.
                      aria-hidden="true"
                    />
                    <span className="side-label">{app.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {canAddApp ? (
          <Link href="/apps/new" className="side-link side-add">
            <span aria-hidden="true">+</span> Add an app
          </Link>
        ) : null}
      </div>

      <div className="side-foot">
        <p className="side-email" title={email}>
          {email}
        </p>
        {signOut}
      </div>
    </nav>
  )
}
