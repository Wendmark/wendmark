import { z } from 'zod'

/**
 * Environment the portal needs, checked once at startup.
 *
 * A missing or malformed value should fail loudly here, with a message that
 * says what to fix, rather than surfacing later as a confusing runtime error.
 */
const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required. See apps/portal/.env.example.')
    .refine(
      (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
      'DATABASE_URL must be a Postgres connection string.',
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof EnvSchema>

function read(): Env {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
    )
    throw new Error(`Portal environment is not set up:\n${problems.join('\n')}`)
  }
  return parsed.data
}

export const env: Env = read()
