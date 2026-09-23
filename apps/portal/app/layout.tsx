import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Wendmark',
  description: 'Record a process once. Guide everyone through it.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
