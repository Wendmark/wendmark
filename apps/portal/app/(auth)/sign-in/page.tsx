import { redirect } from 'next/navigation'
import { needsSetup } from '../../../lib/auth/setup'
import { currentUser } from '../../../lib/auth/session'
import { getEnv, hasOidc } from '../../../lib/env'
import { SignInForm } from './sign-in-form'

export const metadata = { title: 'Sign in to Wendmark' }

export default async function SignInPage() {
  // A brand new instance has nobody to sign in as yet.
  if (await needsSetup()) redirect('/setup')
  if (await currentUser()) redirect('/')

  const env = getEnv()
  const sso = hasOidc(env) ? env.OIDC_NAME : null

  return (
    <main className="card">
      <h1>Sign in</h1>
      <SignInForm ssoName={sso} />
    </main>
  )
}
