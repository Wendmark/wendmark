import { z } from 'zod'

/**
 * Environment the portal needs, checked once at startup.
 *
 * A missing or malformed value should fail loudly here, with a message that
 * says what to fix, rather than surfacing later as a confusing runtime error.
 */
const EnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required. See apps/portal/.env.example.' })
    .min(1, 'DATABASE_URL is required. See apps/portal/.env.example.')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL must be a Postgres connection string.',
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Signs session cookies. Generate one with `openssl rand -base64 32`. */
  AUTH_SECRET: z
    .string({ error: 'AUTH_SECRET is required. Generate one with: openssl rand -base64 32' })
    .min(32, 'AUTH_SECRET should be at least 32 characters.'),

  /**
   * Single sign-on, off unless all three are set. Works with any OpenID
   * Connect provider: Entra ID, Google Workspace, Keycloak, Okta.
   */
  OIDC_ISSUER: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  OIDC_NAME: z.string().min(1).default('single sign-on'),
})

export type Env = z.infer<typeof EnvSchema>

/** Whether single sign-on is configured. */
export function hasOidc(env: Env): boolean {
  return Boolean(env.OIDC_ISSUER && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET)
}

/**
 * An empty variable means the same as an absent one.
 *
 * Compose, Kubernetes and most CI systems have no way to leave an optional
 * variable out: `OIDC_ISSUER: ${OIDC_ISSUER:-}` arrives as an empty string,
 * which `.optional()` does not accept and `.url()` rejects. Treating blank
 * as missing is what every one of those tools means by it.
 */
function withoutBlanks(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const cleaned: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() === '') continue
    cleaned[key] = value
  }
  return cleaned
}

/** Reads and checks environment values, explaining anything that is wrong. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = EnvSchema.safeParse(withoutBlanks(source))
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
    )
    throw new Error(`Portal environment is not set up:\n${problems.join('\n')}`)
  }
  return parsed.data
}

let cached: Env | null = null

/**
 * The checked environment.
 *
 * Read on first use rather than on import: a module that validates as a side
 * effect of being imported cannot be tested, and fails in whatever order the
 * bundler happens to load things.
 */
export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}
