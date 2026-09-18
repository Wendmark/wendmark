import { useState } from 'react'
import { coffees } from '../data'

export function ShopPage() {
  const [added, setAdded] = useState<string | null>(null)

  return (
    <section aria-labelledby="shop-heading">
      <h1 id="shop-heading">Shop</h1>
      <p className="lead">Freshly roasted, delivered to your door.</p>
      <ul className="grid">
        {coffees.map((coffee) => (
          <li key={coffee.id} className="card">
            <h2>{coffee.name}</h2>
            <p className="muted">
              {coffee.origin} · {coffee.roast} roast
            </p>
            <p>{coffee.notes.join(', ')}</p>
            <div className="card-footer">
              <span className="price">{coffee.priceSek} kr</span>
              <button type="button" onClick={() => setAdded(coffee.name)}>
                Add to subscription
              </button>
            </div>
          </li>
        ))}
      </ul>
      {added && (
        <p role="status" className="notice">
          {added} added to your next delivery.
        </p>
      )}
    </section>
  )
}
