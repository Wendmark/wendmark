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
      <h1 id="profile-heading">Profile</h1>
      <form className="form" onSubmit={handleSubmit} onChange={() => setSaved(false)}>
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
        <button type="submit">Save changes</button>
        {saved && (
          <p role="status" className="notice">
            Profile saved.
          </p>
        )}
      </form>
    </section>
  )
}
