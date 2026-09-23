'use server'

import { AuthError } from 'next-auth'
import { signIn } from '../../../lib/auth'

export interface SignInResult {
  error?: string
}

/** Signs in with an email address and a password. */
export async function signInWithPassword(
  _previous: SignInResult,
  form: FormData,
): Promise<SignInResult> {
  try {
    await signIn('credentials', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      redirectTo: '/',
    })
    return {}
  } catch (error) {
    // A redirect is how a successful sign-in ends, so it must pass through.
    if (error instanceof AuthError) {
      // Deliberately vague: saying which half was wrong tells an attacker
      // which email addresses exist.
      return { error: 'That email and password do not match an account.' }
    }
    throw error
  }
}

/** Starts the single sign-on flow, when the deployment has configured it. */
export async function signInWithSso(): Promise<void> {
  await signIn('oidc', { redirectTo: '/' })
}
