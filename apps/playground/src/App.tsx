import { useEffect } from 'react'
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

  // If the user reloaded mid-flow, pick guidance up where they left off.
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
        <button
          type="button"
          className="guide-button"
          onClick={() => window.Wendmark?.start(changeGrindFlow)}
        >
          Guide me
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
