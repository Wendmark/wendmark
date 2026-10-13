import { useState } from 'react'
import { BagArt } from '../components/BagArt'
import { Dialog } from '../components/Dialog'
import { Stars } from '../components/Stars'
import { coffees, findCoffee, tastings as initial, type Tasting } from '../data'

export function TastingsPage() {
  const [tastings, setTastings] = useState<Tasting[]>(initial)
  const [adding, setAdding] = useState(false)
  const [coffeeId, setCoffeeId] = useState(coffees[0]?.id ?? '')
  const [rating, setRating] = useState<Tasting['rating']>(4)
  const [comment, setComment] = useState('')

  function save() {
    setTastings((list) => [
      {
        id: `t${list.length + 1}`,
        coffeeId,
        date: new Date().toISOString().slice(0, 10),
        rating,
        comment: comment.trim() || 'No notes, just enjoyed it.',
      },
      ...list,
    ])
    setAdding(false)
    setComment('')
  }

  return (
    <section aria-labelledby="tastings-heading">
      <div className="page-head">
        <div>
          <h1 id="tastings-heading">My tastings</h1>
          <p className="lead">Your notes on every cup, so you can find your favourites again.</p>
        </div>
        <button type="button" className="button" onClick={() => setAdding(true)}>
          Add a tasting note
        </button>
      </div>

      <ul className="tasting-list">
        {tastings.map((t) => {
          const coffee = findCoffee(t.coffeeId)
          return (
            <li key={t.id} className="panel tasting">
              {coffee && <BagArt coffee={coffee} />}
              <div>
                <h2>{coffee?.name ?? 'Unknown coffee'}</h2>
                <p className="muted small">
                  {t.date} · <Stars value={t.rating} />
                </p>
                <p>{t.comment}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {adding && (
        <Dialog
          title="Add a tasting note"
          onClose={() => setAdding(false)}
          footer={
            <>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button type="button" className="button" onClick={save}>
                Save note
              </button>
            </>
          }
        >
          <div className="form">
            <label>
              Coffee
              <select
                name="tasting-coffee"
                value={coffeeId}
                onChange={(event) => setCoffeeId(event.target.value)}
              >
                {coffees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="star-picker">
              <legend>Rating</legend>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n <= rating ? 'star on' : 'star'}
                  aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                  aria-pressed={n === rating}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </fieldset>
            <label>
              Notes
              <textarea
                name="tasting-comment"
                rows={3}
                placeholder="Bright, fruity, a bit like blackcurrant…"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
          </div>
        </Dialog>
      )}
    </section>
  )
}
