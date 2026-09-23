import { PrismaAdapter } from '@auth/prisma-adapter'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { Provider } from 'next-auth/providers'
import { getDb } from '../db'
import { getEnv, hasOidc } from '../env'
import { verifyPassword } from './password'

/** How long a signed-in session lasts before it must be renewed. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

/** What we add to the session beyond Auth.js's defaults. */
export interface SessionUser {
  id: string
  email: string
  name: string | null
  organizationId: string | null
  role: string | null
}

/** Sign-in with an email address and a password. Always available. */
function credentialsProvider(): Provider {
  return Credentials({
    name: 'password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(raw) {
      const email = typeof raw?.['email'] === 'string' ? raw['email'].trim().toLowerCase() : ''
      const password = typeof raw?.['password'] === 'string' ? raw['password'] : ''
      if (!email || !password) return null

      const user = await getDb().user.findUnique({ where: { email } })
      // Verify even when there is no such user, so the response time does not
      // reveal which email addresses exist.
      const ok = await verifyPassword(user?.passwordHash ?? null, password)
      if (!user || !ok) return null

      return { id: user.id, email: user.email, name: user.name }
    },
  })
}

/** Single sign-on, if the deployment configured it. */
function oidcProvider(): Provider[] {
  const env = getEnv()
  if (!hasOidc(env)) return []

  const issuer = env.OIDC_ISSUER
  const clientId = env.OIDC_CLIENT_ID
  const clientSecret = env.OIDC_CLIENT_SECRET
  if (!issuer || !clientId || !clientSecret) return []

  return [{ id: 'oidc', name: env.OIDC_NAME, type: 'oidc', issuer, clientId, clientSecret }]
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(getDb()),
  providers: [credentialsProvider(), ...oidcProvider()],
  // JWT sessions: nothing to store, nothing to look up. Individual sessions
  // cannot be deleted, so user.sessionVersion is how revocation works — see
  // docs/decisions/auth.md.
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/sign-in' },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      if (!token.sub) return token

      // Read membership and session version on each renewal, so a role change
      // or a forced sign-out takes effect without waiting for expiry.
      const account = await getDb().user.findUnique({
        where: { id: token.sub },
        select: {
          sessionVersion: true,
          memberships: {
            select: { organizationId: true, role: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      })
      if (!account) return {}

      const known = typeof token['sessionVersion'] === 'number' ? token['sessionVersion'] : null
      if (known !== null && known !== account.sessionVersion) return {}

      token['sessionVersion'] = account.sessionVersion
      const membership = account.memberships[0]
      token['organizationId'] = membership?.organizationId ?? null
      token['role'] = membership?.role ?? null
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      session.user.organizationId =
        typeof token['organizationId'] === 'string' ? token['organizationId'] : null
      session.user.role = typeof token['role'] === 'string' ? token['role'] : null
      return session
    },
  },
}
