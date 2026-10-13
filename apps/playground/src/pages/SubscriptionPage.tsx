import { useState } from 'react'
import { BagArt } from '../components/BagArt'
import { Dialog } from '../components/Dialog'
import { coffees, plans } from '../data'

type PlanId = (typeof plans)[number]['id']

export function SubscriptionPage() {
  const [plan, setPlan] = useState<PlanId>('two')
  const [pendingPlan, setPendingPlan] = useState<PlanId>('two')
  const [skipped, setSkipped] = useState(false)
  const [pausedFor, setPausedFor] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'plan' | 'pause' | null>(null)
  const [pauseChoice, setPauseChoice] = useState('1 month')
  const [notice, setNotice] = useState<string | null>(null)

  const current = plans.find((p) => p.id === plan) ?? plans[1]
  const nextBox = coffees.filter((c) => ['tarrazu', 'nyamasheke'].includes(c.id))
  const nextDate = skipped ? '17 November' : '20 October'

  return (
    <section aria-labelledby="subscription-heading">
      <h1 id="subscription-heading">Subscription</h1>

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      <div className="sub-grid">
        <div className="panel">
          <div className="row-between">
            <div>
              <p className="eyebrow">Your plan</p>
              <h2>{current.label}</h2>
              <p className="muted">{current.priceSek} kr / month · free delivery</p>
            </div>
            <span className={`badge ${pausedFor ? 'badge-paused' : 'badge-active'}`}>
              {pausedFor ? `Paused for ${pausedFor}` : 'Active'}
            </span>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button"
              onClick={() => {
                setPendingPlan(plan)
                setDialog('plan')
              }}
            >
              Change plan
            </button>
            {pausedFor ? (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setPausedFor(null)
                  setNotice('Welcome back! Your subscription is active again.')
                }}
              >
                Resume subscription
              </button>
            ) : (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setDialog('pause')}
              >
                Pause subscription
              </button>
            )}
          </div>
        </div>

        <div className="panel">
          <p className="eyebrow">Next delivery</p>
          <h2>{pausedFor ? 'On hold' : nextDate}</h2>
          <ul className="next-box">
            {nextBox.map((coffee) => (
              <li key={coffee.id}>
                <BagArt coffee={coffee} />
                <span>
                  <strong>{coffee.name}</strong>
                  <span className="muted small">{coffee.origin}</span>
                </span>
              </li>
            ))}
          </ul>
          {!pausedFor && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                setSkipped((s) => !s)
                setNotice(
                  skipped
                    ? 'Your 20 October delivery is back on.'
                    : 'Skipped. Your next delivery is on 17 November.',
                )
              }}
            >
              {skipped ? 'Undo skip' : 'Skip next delivery'}
            </button>
          )}
        </div>
      </div>

      {dialog === 'plan' && (
        <Dialog
          title="Change your plan"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="button button-ghost" onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  setPlan(pendingPlan)
                  setDialog(null)
                  const label = plans.find((p) => p.id === pendingPlan)?.label ?? ''
                  setNotice(`Plan changed to ${label}. It starts with your next delivery.`)
                }}
              >
                Save plan
              </button>
            </>
          }
        >
          <fieldset className="options">
            <legend className="visually-hidden">Plan</legend>
            {plans.map((p) => (
              <label key={p.id} className="option-card option-card-wide">
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={pendingPlan === p.id}
                  onChange={() => setPendingPlan(p.id)}
                />
                <strong>{p.label}</strong>
                <span>{p.priceSek} kr</span>
              </label>
            ))}
          </fieldset>
        </Dialog>
      )}

      {dialog === 'pause' && (
        <Dialog
          title="Pause your subscription"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="button button-ghost" onClick={() => setDialog(null)}>
                Keep it running
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  setPausedFor(pauseChoice)
                  setDialog(null)
                  setNotice(`Paused for ${pauseChoice}. We won't charge you until then.`)
                }}
              >
                Pause
              </button>
            </>
          }
        >
          <p>Going away? We'll hold your deliveries and pick up again when you're back.</p>
          <label className="field">
            Pause for
            <select
              name="pause-length"
              value={pauseChoice}
              onChange={(event) => setPauseChoice(event.target.value)}
            >
              <option>1 month</option>
              <option>2 months</option>
              <option>3 months</option>
            </select>
          </label>
        </Dialog>
      )}
    </section>
  )
}
