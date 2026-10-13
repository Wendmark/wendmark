import { useCallback, useRef, useState, type ReactNode } from 'react'
import { CartProvider, useCart } from './cart'
import { CartDrawer } from './components/CartDrawer'
import { findCoffee } from './data'
import { BillingPage } from './pages/BillingPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { CoffeePage } from './pages/CoffeePage'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
import { ShopPage } from './pages/ShopPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { TastingsPage } from './pages/TastingsPage'
import { Link, usePathname } from './router'

const navLinks = [
  { path: '/', label: 'Shop' },
  { path: '/subscription', label: 'Subscription' },
  { path: '/orders', label: 'Orders' },
  { path: '/billing', label: 'Billing' },
  { path: '/tastings', label: 'My tastings' },
  { path: '/profile', label: 'Profile' },
]

export function App() {
  return (
    <CartProvider>
      <Shell />
    </CartProvider>
  )
}

function Shell() {
  const pathname = usePathname()
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  return (
    <div className="shell">
      <Header pathname={pathname} />
      <main className="content">{route(pathname, showToast)}</main>
      <Footer />
      <CartDrawer />
      {toast && (
        <p role="status" className="toast">
          {toast}
        </p>
      )}
    </div>
  )
}

function route(pathname: string, onAdded: (message: string) => void): ReactNode {
  if (pathname === '/') return <ShopPage onAdded={onAdded} />
  if (pathname === '/subscription') return <SubscriptionPage />
  if (pathname === '/orders') return <OrdersPage />
  if (pathname === '/tastings') return <TastingsPage />
  if (pathname === '/profile') return <ProfilePage />
  if (pathname === '/checkout') return <CheckoutPage />
  if (pathname === '/billing') return <BillingPage />

  const coffeeMatch = /^\/coffee\/([\w-]+)$/.exec(pathname)
  const coffee = coffeeMatch?.[1] ? findCoffee(coffeeMatch[1]) : undefined
  if (coffee) return <CoffeePage key={coffee.id} coffee={coffee} onAdded={onAdded} />

  return (
    <section className="empty-state">
      <h1>Page not found</h1>
      <Link to="/" className="button">
        Back to the shop
      </Link>
    </section>
  )
}

function Header({ pathname }: { pathname: string }) {
  const cart = useCart()
  const isCurrent = (path: string) =>
    path === '/' ? pathname === '/' || pathname.startsWith('/coffee/') : pathname === path

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Fika home">
        <span className="brand-mark" aria-hidden="true">
          ☕
        </span>
        Fika
      </Link>
      <nav aria-label="Main">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="nav-link"
            aria-current={isCurrent(link.path) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="topbar-end">
        <button type="button" className="cart-button" onClick={cart.open}>
          <span aria-hidden="true">🛍</span>
          Cart
          {cart.count > 0 && (
            <span className="cart-count" aria-label={`${cart.count} items`}>
              {cart.count}
            </span>
          )}
        </button>
        <Link to="/profile" className="avatar" aria-label="Your profile">
          AL
        </Link>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>Fika</strong>
        <p className="muted small">Small-batch coffee, roasted in Stockholm since 2019.</p>
      </div>
      <ul className="footer-links">
        <li>Help centre</li>
        <li>Delivery and returns</li>
        <li>Terms</li>
        <li>© 2026 Fika Kaffe AB</li>
      </ul>
    </footer>
  )
}
