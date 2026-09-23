import { redirect } from 'next/navigation'
import { auth } from './index'

/** Who is signed in, and where they are acting. */
export interface CurrentUser {
  id: string
  email: string
  name: string | null
  organizationId: string | null
  role: string | null
}

/**
 * Everything that reads a session goes through here, so the decision to keep
 * sessions in a JWT rather than the database stays in one place.
 */
export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  const user = session?.user
  if (!user?.id || !user.email) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    organizationId: user.organizationId,
    role: user.role,
  }
}

/** The signed-in user, or a redirect to sign in. For pages and actions. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser()
  if (!user) redirect('/sign-in')
  return user
}
