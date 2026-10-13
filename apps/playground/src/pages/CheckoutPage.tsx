import { useState, type FormEvent } from 'react'
import { useCart } from '../cart'
import { findCoffee, priceFor, profile, shippingOptions, sizes } from '../data'
import { Link } from '../router'

type Step = 'delivery' | 'shipping' | 'review' | 'done'

const stepOrder: { id: Exclude<Step, 'done'>; label: string }[] = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'review', label: 'Review' },
]

const payments = ['Card on delivery', 'Invoice', 'Swish'] as const

export function CheckoutPage() {
  const cart = useCart()
  const [step, setStep] = useState<Step>('delivery')
  const [shipping, setShipping] = useState<(typeof shippingOptions)[number]['id']>('standard')
  const [payment, setPayment] = useState<(typeof payments)[number]>('Card on delivery')
  const [orderId, setOrderId] = useState('')

  const shippingCost = shippingOptions.find((s) => s.id === shipping)?.priceSek ?? 0

  if (step === 'done') {
    return (
      <section className="confirmation" aria-labelledby="done-heading">
        <div className="confirmation-icon" aria-hidden="true">
          ✓
        </div>
        <h1 id="done-heading">Thanks, your order is in</h1>
        <p className="lead">
          Order <strong>{orderId}</strong> will be roasted on Monday. We'll email you when it ships.
        </p>
        <div className="button-row">
          <Link to="/orders" className="button">
            See your orders
          </Link>
          <Link to="/" className="button button-ghost">
            Keep shopping
          </Link>
        </div>
      </section>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <section className="empty-state" aria-labelledby="checkout-heading">
        <h1 id="checkout-heading">Checkout</h1>
        <p>Your cart is empty, so there's nothing to check out yet.</p>
        <Link to="/" className="button">
          Browse coffees
        </Link>
      </section>
    )
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 'delivery') setStep('shipping')
    else if (step === 'shipping') setStep('review')
    else {
      setOrderId(`FK-${10700 + Math.floor(Math.random() * 300)}`)
      cart.clear()
      setStep('done')
    }
  }

  const currentIndex = stepOrder.findIndex((s) => s.id === step)

  return (
    <section aria-labelledby="checkout-heading">
      <h1 id="checkout-heading">Checkout</h1>

      <ol className="stepper" aria-label="Checkout progress">
        {stepOrder.map((s, index) => (
          <li
            key={s.id}
            className={index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            <span className="stepper-dot">{index < currentIndex ? '✓' : index + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="checkout">
        <form className="panel form" onSubmit={next}>
          {step === 'delivery' && (
            <>
              <h2>Where should we send it?</h2>
              <label>
                Full name
                <input name="checkout-name" defaultValue={profile.name} autoComplete="name" />
              </label>
              <label>
                Email
                <input
                  name="checkout-email"
                  type="email"
                  defaultValue={profile.email}
                  autoComplete="email"
                />
              </label>
              <label>
                Street address
                <input
                  name="checkout-street"
                  defaultValue="Storgatan 12"
                  autoComplete="street-address"
                />
              </label>
              <div className="field-row">
                <label>
                  Postcode
                  <input
                    name="checkout-postcode"
                    defaultValue="111 22"
                    autoComplete="postal-code"
                  />
                </label>
                <label>
                  City
                  <input
                    name="checkout-city"
                    defaultValue="Stockholm"
                    autoComplete="address-level2"
                  />
                </label>
              </div>
              <button type="submit" className="button">
                Continue to shipping
              </button>
            </>
          )}

          {step === 'shipping' && (
            <>
              <h2>How fast do you need it?</h2>
              <fieldset className="options">
                <legend className="visually-hidden">Shipping method</legend>
                {shippingOptions.map((option) => (
                  <label key={option.id} className="option-card option-card-wide">
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={shipping === option.id}
                      onChange={() => setShipping(option.id)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <span className="muted small">{option.detail}</span>
                    </span>
                    <span>{option.priceSek === 0 ? 'Free' : `${option.priceSek} kr`}</span>
                  </label>
                ))}
              </fieldset>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setStep('delivery')}
                >
                  Back
                </button>
                <button type="submit" className="button">
                  Continue to review
                </button>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <h2>Check and pay</h2>
              <fieldset className="options">
                <legend>Payment</legend>
                <div className="option-row">
                  {payments.map((p) => (
                    <label key={p} className="option-card">
                      <input
                        type="radio"
                        name="payment"
                        value={p}
                        checked={payment === p}
                        onChange={() => setPayment(p)}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox">
                <input type="checkbox" name="newsletter" />
                Send me tasting notes and new roasts by email
              </label>
              <div className="button-row">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setStep('shipping')}
                >
                  Back
                </button>
                <button type="submit" className="button">
                  Place order · {cart.subtotal + shippingCost} kr
                </button>
              </div>
            </>
          )}
        </form>

        <aside className="panel summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <ul className="summary-lines">
            {cart.lines.map((line) => {
              const coffee = findCoffee(line.coffeeId)
              if (!coffee) return null
              const size = sizes.find((s) => s.id === line.size)?.label ?? line.size
              return (
                <li key={line.key} className="row-between">
                  <span>
                    {line.quantity} × {coffee.name}
                    <span className="muted small"> {size}</span>
                  </span>
                  <span>{priceFor(coffee, line.size) * line.quantity} kr</span>
                </li>
              )
            })}
          </ul>
          <div className="row-between muted">
            <span>Shipping</span>
            <span>{shippingCost === 0 ? 'Free' : `${shippingCost} kr`}</span>
          </div>
          <div className="row-between total">
            <span>Total</span>
            <strong>{cart.subtotal + shippingCost} kr</strong>
          </div>
        </aside>
      </div>
    </section>
  )
}
