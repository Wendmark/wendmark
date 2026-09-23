import { redirect } from 'next/navigation'
import { requireUser } from '../../../../lib/auth/session'
import { can } from '../../../../lib/permissions'
import { NewAppForm } from './new-app-form'

export const metadata = { title: 'Add an app' }

export default async function NewAppPage() {
  const user = await requireUser()
  if (!can(user.role, 'app:create')) redirect('/')

  return (
    <section>
      <h1>Add an app</h1>
      <p className="muted">
        The addresses you list here are the only ones allowed to use this app&apos;s key.
      </p>
      <NewAppForm />
    </section>
  )
}
