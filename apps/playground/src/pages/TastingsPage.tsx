import { coffees, tastings } from '../data'

function coffeeName(id: string): string {
  return coffees.find((c) => c.id === id)?.name ?? 'Unknown coffee'
}

export function TastingsPage() {
  return (
    <section aria-labelledby="tastings-heading">
      <h1 id="tastings-heading">My tastings</h1>
      <ul className="list">
        {tastings.map((t) => (
          <li key={t.id} className="card">
            <h2>{coffeeName(t.coffeeId)}</h2>
            <p className="muted">
              {t.date} · <span aria-label={`${t.rating} out of 5`}>{'★'.repeat(t.rating)}</span>
            </p>
            <p>{t.comment}</p>
          </li>
        ))}
      </ul>
      <button type="button">Add a tasting note</button>
    </section>
  )
}
