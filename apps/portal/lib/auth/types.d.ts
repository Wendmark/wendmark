import type { DefaultSession } from 'next-auth'

/**
 * The extra things Wendmark keeps on a session: which organization the user
 * is acting in, and what they may do there.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      organizationId: string | null
      role: string | null
    } & DefaultSession['user']
  }
}
