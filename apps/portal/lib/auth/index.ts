import NextAuth from 'next-auth'
import { authConfig } from './config'

// The config is a function, so Auth.js builds it per request rather than
// when this module is imported. Nothing here touches the database or the
// environment until something actually asks about a session — which is what
// lets `next build` collect these routes without a live database.
export const { handlers, auth, signIn, signOut } = NextAuth(() => authConfig())
