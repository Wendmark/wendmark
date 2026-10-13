import { useState } from 'react'
import { BagArt } from '../components/BagArt'
import { Stars } from '../components/Stars'
import { useCart } from '../cart'
import { coffees, grinds, priceFor, sizes, type Coffee, type Grind, type SizeId } from '../data'
import { Link } from '../router'

export function CoffeePage({
  coffee,
  onAdded,
}: {
  coffee: Coffee
  onAdded: (message: string) => void
}) {
  const cart = useCart()
  const [size, setSize] = useState<SizeId>('250g')
  const [grind, setGrind] = useState<Grind>('Whole bean')
  const [quantity, setQuantity] = useState(1)

  const others = coffees.filter((c) => c.id !== coffee.id && c.roast === coffee.roast).slice(0, 3)

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{coffee.name}</span>
      </nav>

      <section className="detail" aria-labelledby="coffee-heading">
        <BagArt coffee={coffee} size="lg" />

        <div className="detail-main">
          {coffee.badge && (
            <span className={`badge badge-${coffee.badge.toLowerCase()}`}>{coffee.badge}</span>
          )}
          <h1 id="coffee-heading">{coffee.name}</h1>
          <p className="muted">
            {coffee.origin} · {coffee.roast} roast{coffee.decaf ? ' · Decaf' : ''}
          </p>
          <div className="rating-row">
            <Stars value={coffee.rating} />
            <span className="muted small">
              {coffee.rating} · {coffee.reviews} reviews
            </span>
          </div>
          <p>{coffee.description}</p>
          <p className="notes">
            {coffee.notes.map((note) => (
              <span key={note} className="note">
                {note}
              </span>
            ))}
          </p>

          <fieldset className="options">
            <legend>Bag size</legend>
            <div className="option-row">
              {sizes.map((s) => (
                <label key={s.id} className="option-card">
                  <input
                    type="radio"
                    name="size"
                    value={s.id}
                    checked={size === s.id}
                    onChange={() => setSize(s.id)}
                  />
                  <span>{s.label}</span>
                  <span className="muted small">{priceFor(coffee, s.id)} kr</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            Grind
            <select
              name="detail-grind"
              value={grind}
              onChange={(event) => setGrind(event.target.value as Grind)}
            >
              {grinds.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>

          <div className="buy-row">
            <div className="qty qty-large">
              <button
                type="button"
                aria-label="One fewer"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span aria-live="polite">{quantity}</span>
              <button type="button" aria-label="One more" onClick={() => setQuantity((q) => q + 1)}>
                +
              </button>
            </div>
            <button
              type="button"
              className="button button-large"
              onClick={() => {
                cart.add(coffee.id, size, grind, quantity)
                onAdded(`${quantity} × ${coffee.name} added to your cart`)
                cart.open()
              }}
            >
              Add to cart · {priceFor(coffee, size) * quantity} kr
            </button>
          </div>
          <p className="muted small">Roasted Monday, shipped Tuesday. Free delivery.</p>
        </div>
      </section>

      {others.length > 0 && (
        <section className="related" aria-labelledby="related-heading">
          <h2 id="related-heading">More {coffee.roast.toLowerCase()} roasts</h2>
          <ul className="related-grid">
            {others.map((other) => (
              <li key={other.id}>
                <Link to={`/coffee/${other.id}`} className="related-card">
                  <BagArt coffee={other} />
                  <span>
                    <strong>{other.name}</strong>
                    <span className="muted small">from {other.priceSek} kr</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
