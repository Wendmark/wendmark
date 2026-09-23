import type { ReactNode } from 'react'

/** Bare layout for signing in and first-run setup: no navigation to show. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="centered">{children}</div>
}
