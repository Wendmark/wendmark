import { useEffect } from 'react'
import { useCart } from '../cart'
import { findCoffee, priceFor, sizes } from '../data'
import { navigate } from '../router'
import { BagArt } from './BagArt'

/** The cart, sliding in from the right. */
export function CartDrawer() {
  const cart = useCart()
  const { isOpen, close } = cart

  useEffect(() => {
    if (!isOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div className="backdrop" onClick={close}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-head">
          <h2>Your cart</h2>
          <button type="button" className="icon-button" aria-label="Close cart" onClick={close}>
            ✕
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <div className="drawer-empty">
            <p>Your cart is empty.</p>
            <button
              type="button"
              className="button"
              onClick={() => {
                close()
                navigate('/')
              }}
            >
              Browse coffees
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.lines.map((line) => {
                const coffee = findCoffee(line.coffeeId)
                if (!coffee) return null
                const size = sizes.find((s) => s.id === line.size)?.label ?? line.size
                return (
                  <li key={line.key} className="cart-line">
                    <BagArt coffee={coffee} />
                    <div className="cart-line-main">
                      <strong>{coffee.name}</strong>
                      <span className="muted">
                        {size} · {line.grind}
                      </span>
                      <div className="qty">
                        <button
                          type="button"
                          aria-label={`One fewer ${coffee.name}`}
                          onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                        >
                          −
                        </button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`One more ${coffee.name}`}
                          onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="cart-line-end">
                      <strong>{priceFor(coffee, line.size) * line.quantity} kr</strong>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => cart.remove(line.key)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <footer className="drawer-foot">
              <div className="row-between">
                <span>Subtotal</span>
                <strong>{cart.subtotal} kr</strong>
              </div>
              <p className="muted small">Free delivery on every order.</p>
              <button
                type="button"
                className="button button-block"
                onClick={() => {
                  close()
                  navigate('/checkout')
                }}
              >
                Go to checkout
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
