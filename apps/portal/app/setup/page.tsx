import { redirect } from 'next/navigation'
import { needsSetup } from '../../lib/auth/setup'
import { SetupForm } from './setup-form'

export const metadata = { title: 'Set up Wendmark' }

/** First run: create the organization and its first administrator. */
export default async function SetupPage() {
  if (!(await needsSetup())) redirect('/sign-in')

  return (
    <main className="card">
      <h1>Set up Wendmark</h1>
      <p className="muted">
        This creates your organization and its first administrator. It is only available while no
        accounts exist.
      </p>
      <SetupForm />
    </main>
  )
}
