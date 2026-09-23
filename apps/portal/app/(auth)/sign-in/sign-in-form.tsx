'use client'

import { useActionState } from 'react'
import { signInWithPassword, signInWithSso, type SignInResult } from './actions'

const initial: SignInResult = {}

export function SignInForm({ ssoName }: { ssoName: string | null }) {
  const [state, action, pending] = useActionState(signInWithPassword, initial)

  return (
    <>
      <form action={action} className="form">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {state.error ? <p role="alert">{state.error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {ssoName ? (
        <form action={signInWithSso} className="form">
          <button type="submit" className="secondary">
            Sign in with {ssoName}
          </button>
        </form>
      ) : null}
    </>
  )
}
