import { useEffect, useState } from 'react'
import { Link, usePathname } from './router'
import { changeGrindFlow } from './wendmark/flows'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
import { ShopPage } from './pages/ShopPage'
import { TastingsPage } from './pages/TastingsPage'

const routes = [
  { path: '/', label: 'Shop', element: <ShopPage /> },
  { path: '/orders', label: 'Orders', element: <OrdersPage /> },
  { path: '/tastings', label: 'My tastings', element: <TastingsPage /> },
  { path: '/profile', label: 'Profile', element: <ProfilePage /> },
]

export function App() {
  const pathname = usePathname()
  const [recording, setRecording] = useState(false)

  // The snippet picks a process up where the user left off by itself, using
  // the portal. This only covers the harness's own hand-written flow, which
  // the portal knows nothing about.
  useEffect(() => {
    window.Wendmark?.resume([changeGrindFlow])
  }, [])
  const current = routes.find((r) => r.path === pathname)

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Fika
        </Link>
        {/*
          A developer harness, not how a customer would normally use Wendmark.
          These buttons call the snippet's API directly with a hand-written
          flow, which is the quickest way to exercise the engine while
          working on it. The product path is: record from the portal, publish
          there, and let users find flows in the launcher.
        */}
        <span className="harness-label" title="Developer harness, not the product path">
          Dev harness
        </span>
        <button
          type="button"
          className="guide-button"
          onClick={() => window.Wendmark?.start(changeGrindFlow)}
        >
          Play demo flow
        </button>
        <button
          type="button"
          className="record-button"
          onClick={() => {
            if (recording) {
              const flow = window.Wendmark?.stopRecording()
              setRecording(false)
              // Play it back straight away, and log it so it can be kept.
              console.log(JSON.stringify(flow, null, 2))
              if (flow) window.Wendmark?.start(flow)
            } else {
              window.Wendmark?.record({ name: 'Recorded in Fika' })
              setRecording(true)
            }
          }}
        >
          {recording ? 'Stop and replay' : 'Record by hand'}
        </button>
        <nav aria-label="Main">
          {routes.map((r) => (
            <Link
              key={r.path}
              to={r.path}
              className="nav-link"
              aria-current={r.path === pathname ? 'page' : undefined}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="content">
        {current ? (
          current.element
        ) : (
          <section>
            <h1>Page not found</h1>
            <Link to="/">Back to the shop</Link>
          </section>
        )}
      </main>
    </div>
  )
}
