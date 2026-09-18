import { SCHEMA_VERSION } from '@wendmark/core'

// Placeholder: no product features yet.
export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', maxWidth: 640 }}>
      <h1>Wendmark</h1>
      <p>Portal placeholder. Flow schema version {SCHEMA_VERSION}.</p>
    </main>
  )
}
