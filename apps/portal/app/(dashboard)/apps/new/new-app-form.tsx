'use client'

import { useActionState } from 'react'
import { createAppAction, type FormResult } from '../../../../actions/apps'

const initial: FormResult = {}

export function NewAppForm() {
  const [state, action, pending] = useActionState(createAppAction, initial)

  return (
    <form action={action} className="form">
      <label>
        Name
        <input name="name" required placeholder="Fika" />
      </label>
      <label>
        Addresses, one per line
        <textarea
          name="origins"
          required
          rows={4}
          placeholder={
            'https://app.example.com\nhttps://staging.example.com\nhttp://localhost:5174'
          }
        />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add app'}
      </button>
    </form>
  )
}
