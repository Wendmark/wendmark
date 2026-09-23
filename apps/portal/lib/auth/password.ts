import { hash, verify } from '@node-rs/argon2'

/**
 * Password hashing with Argon2id, the current recommendation for password
 * storage: memory-hard, so custom hardware buys an attacker much less than
 * it does against older algorithms.
 *
 * Parameters follow OWASP's guidance (19 MiB, two passes).
 */
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

/** The shortest password we will accept, in characters. */
export const MIN_PASSWORD_LENGTH = 12

/** Whether a password is acceptable, and why not when it is not. */
export function checkPassword(password: string): { ok: true } | { ok: false; reason: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  if (password.trim() === '') return { ok: false, reason: 'Use something other than spaces.' }
  return { ok: true }
}

/** Hashes a password for storage. Never store or log the password itself. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS)
}

/**
 * Whether a password matches a stored hash.
 *
 * A malformed or missing hash is a failed sign-in, not an error: an account
 * that signs in through SSO has no password at all.
 */
export async function verifyPassword(hashed: string | null, password: string): Promise<boolean> {
  if (!hashed) return false
  try {
    return await verify(hashed, password, OPTIONS)
  } catch {
    return false
  }
}
