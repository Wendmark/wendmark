'use server'

import { redirect } from 'next/navigation'
import { getDb } from '../../lib/db'
import { checkPassword, hashPassword } from '../../lib/auth/password'
import { needsSetup } from '../../lib/auth/setup'

export interface SetupResult {
  error?: string
}

/** Creates the first organization, its administrator, and nothing else. */
export async function createFirstAdmin(
  _previous: SetupResult,
  form: FormData,
): Promise<SetupResult> {
  // Checked again here: a form could be submitted after someone else has
  // already finished setting the instance up.
  if (!(await needsSetup())) return { error: 'This instance is already set up.' }

  const organizationName = String(form.get('organization') ?? '').trim()
  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(form.get('password') ?? '')

  if (!organizationName) return { error: 'Give your organization a name.' }
  if (!email.includes('@')) return { error: 'That does not look like an email address.' }

  const strong = checkPassword(password)
  if (!strong.ok) return { error: strong.reason }

  await getDb().organization.create({
    data: {
      name: organizationName,
      memberships: {
        create: {
          role: 'admin',
          user: {
            create: { email, name: name || null, passwordHash: await hashPassword(password) },
          },
        },
      },
    },
  })

  redirect('/sign-in?setup=done')
}
