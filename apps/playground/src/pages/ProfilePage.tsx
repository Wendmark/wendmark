import { useState, type FormEvent } from 'react'
import { profile } from '../data'

export function ProfilePage() {
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <section aria-labelledby="profile-heading">
      <div className="profile-head">
        <span className="avatar avatar-large" aria-hidden="true">
          AL
        </span>
        <div>
          <h1 id="profile-heading">Profile</h1>
          <p className="lead">Member since March 2024</p>
        </div>
      </div>

      <div className="profile-grid">
        <form className="form panel" onSubmit={handleSubmit} onChange={() => setSaved(false)}>
          <h2>Your details</h2>
          <label>
            Name
            <input name="name" defaultValue={profile.name} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" defaultValue={profile.email} autoComplete="email" />
          </label>
          <label>
            Delivery address
            <input name="address" defaultValue={profile.address} autoComplete="street-address" />
          </label>
          <label>
            Plan
            <select name="plan" defaultValue={profile.plan}>
              <option>One bag / month</option>
              <option>Two bags / month</option>
              <option>Four bags / month</option>
            </select>
          </label>
          <label>
            Grind
            <select name="grind" defaultValue={profile.grind}>
              <option>Whole bean</option>
              <option>Filter</option>
              <option>Espresso</option>
            </select>
          </label>
          <button type="submit" className="button">
            Save changes
          </button>
          {saved && (
            <p role="status" className="notice">
              Profile saved.
            </p>
          )}
        </form>

        <div className="panel">
          <h2>Notifications</h2>
          <label className="switch">
            <input type="checkbox" name="notify-shipping" defaultChecked />
            <span>When my order ships</span>
          </label>
          <label className="switch">
            <input type="checkbox" name="notify-roasts" defaultChecked />
            <span>New and limited roasts</span>
          </label>
          <label className="switch">
            <input type="checkbox" name="notify-marketing" />
            <span>Offers and discounts</span>
          </label>
        </div>
      </div>
    </section>
  )
}
