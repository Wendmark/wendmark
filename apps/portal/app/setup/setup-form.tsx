'use client'

import { useActionState } from 'react'
import { createFirstAdmin, type SetupResult } from './actions'

const initial: SetupResult = {}

export function SetupForm() {
  const [state, action, pending] = useActionState(createFirstAdmin, initial)

  return (
    <form action={action} className="form">
      <label>
        Organization
        <input name="organization" required autoComplete="organization" />
      </label>
      <label>
        Your name
        <input name="name" autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="new-password" />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create administrator'}
      </button>
    </form>
  )
}
