import { signOut } from '../../lib/auth'

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server'
        await signOut({ redirectTo: '/sign-in' })
      }}
    >
      <button type="submit" className="secondary">
        Sign out
      </button>
    </form>
  )
}
