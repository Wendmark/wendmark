import { randomBytes } from 'node:crypto'

/**
 * The key that appears in a customer's script tag. It identifies an app; it
 * does not authenticate anyone, because anyone reading the page can see it.
 * Permission to change flows comes from a portal session, never from this.
 */
const PREFIX = 'wm_'
const RANDOM_BYTES = 18
/** Crockford-style: no look-alike characters to misread over a phone call. */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

/** A new public key, e.g. wm_4k7pq2r9wxz3m8n5htvb6cd2. */
export function generatePublicKey(): string {
  const bytes = randomBytes(RANDOM_BYTES)
  let key = ''
  for (const byte of bytes) {
    key += ALPHABET[byte % ALPHABET.length]
  }
  return `${PREFIX}${key}`
}

/** Whether a string looks like one of our keys, before hitting the database. */
export function isPublicKey(value: string): boolean {
  if (!value.startsWith(PREFIX)) return false
  const body = value.slice(PREFIX.length)
  if (body.length !== RANDOM_BYTES) return false
  return [...body].every((character) => ALPHABET.includes(character))
}
