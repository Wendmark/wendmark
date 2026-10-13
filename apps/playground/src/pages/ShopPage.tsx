import { useMemo, useState } from 'react'
import { BagArt } from '../components/BagArt'
import { Stars } from '../components/Stars'
import { useCart } from '../cart'
import { coffees, type Roast } from '../data'
import { Link } from '../router'

type Filter = 'All' | Roast | 'Decaf'
type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating'

const filters: Filter[] = ['All', 'Light', 'Medium', 'Dark', 'Decaf']

export function ShopPage({ onAdded }: { onAdded: (message: string) => void }) {
  const cart = useCart()
  const [filter, setFilter] = useState<Filter>('All')
  const [sort, setSort] = useState<Sort>('featured')
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = coffees.filter((coffee) => {
      if (filter === 'Decaf' && !coffee.decaf) return false
      if (filter !== 'All' && filter !== 'Decaf' && coffee.roast !== filter) return false
      if (!needle) return true
      return [coffee.name, coffee.origin, ...coffee.notes].some((s) =>
        s.toLowerCase().includes(needle),
      )
    })
    if (sort === 'price-asc') return [...list].sort((a, b) => a.priceSek - b.priceSek)
    if (sort === 'price-desc') return [...list].sort((a, b) => b.priceSek - a.priceSek)
    if (sort === 'rating') return [...list].sort((a, b) => b.rating - a.rating)
    return list
  }, [filter, sort, query])

  return (
    <>
      <h1 className="visually-hidden">Shop</h1>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by roast">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="toolbar-end">
          <label className="search">
            <span className="visually-hidden">Search coffees</span>
            <input
              type="search"
              name="q"
              placeholder="Search origin or flavour"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="select-inline">
            Sort
            <select
              name="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
            >
              <option value="featured">Featured</option>
              <option value="rating">Top rated</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      <p className="muted small" aria-live="polite">
        {shown.length} {shown.length === 1 ? 'coffee' : 'coffees'}
      </p>

      <ul className="product-grid">
        {shown.map((coffee) => (
          <li key={coffee.id} className="product-card">
            <Link to={`/coffee/${coffee.id}`} className="product-link">
              {coffee.badge && (
                <span className={`badge badge-${coffee.badge.toLowerCase()}`}>{coffee.badge}</span>
              )}
              <BagArt coffee={coffee} />
              <h2>{coffee.name}</h2>
            </Link>
            <p className="muted small">
              {coffee.origin} · {coffee.roast} roast{coffee.decaf ? ' · Decaf' : ''}
            </p>
            <p className="notes">
              {coffee.notes.map((note) => (
                <span key={note} className="note">
                  {note}
                </span>
              ))}
            </p>
            <div className="rating-row">
              <Stars value={coffee.rating} />
              <span className="muted small">({coffee.reviews})</span>
            </div>
            <div className="card-footer">
              <span className="price">from {coffee.priceSek} kr</span>
              <button
                type="button"
                className="button button-small"
                onClick={() => {
                  cart.add(coffee.id, '250g', 'Whole bean')
                  onAdded(`${coffee.name} added to your cart`)
                }}
              >
                Add to cart
              </button>
            </div>
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <div className="empty-state">
          <p>No coffees match that. Try another roast or search.</p>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setFilter('All')
              setQuery('')
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  )
}
