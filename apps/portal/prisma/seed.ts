/**
 * Development data: one organization, one member, one app and one flow.
 *
 * Safe to run repeatedly — everything is upserted by a stable key.
 *
 * Sign in as dev@example.com with the password below. Development only: a
 * real installation creates its first administrator through /setup.
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { hashPassword } from '../lib/auth/password'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is not set. See apps/portal/.env.example.')

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

/** Development only. Real installations set a password through /setup. */
const DEV_PASSWORD = 'development password'

/** The Fika demo flow, as the recorder would produce it. */
const demoSteps = [
  {
    type: 'action',
    id: 's1',
    text: 'Open your Profile',
    dynamic: false,
    target: {
      selectors: ['nav a[href="/profile"]'],
      role: 'link',
      name: 'Profile',
      text: 'Profile',
      url: '/',
    },
  },
  {
    type: 'input',
    id: 's2',
    text: 'Choose a Grind',
    target: {
      selectors: ['select[name="grind"]'],
      role: 'combobox',
      name: 'Grind',
      context: 'Profile',
      url: '/profile',
    },
  },
  {
    type: 'action',
    id: 's3',
    text: 'Click Save changes',
    dynamic: false,
    target: {
      selectors: ['form.form button[type="submit"]'],
      role: 'button',
      name: 'Save changes',
      context: 'Profile',
      url: '/profile',
    },
  },
]

async function main(): Promise<void> {
  const organization = await db.organization.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: { id: '00000000-0000-4000-8000-000000000001', name: 'Acme' },
  })

  const passwordHash = await hashPassword(DEV_PASSWORD)
  const user = await db.user.upsert({
    where: { email: 'dev@example.com' },
    update: { passwordHash },
    create: { email: 'dev@example.com', name: 'Dev User', passwordHash },
  })

  await db.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: 'admin' },
    create: { organizationId: organization.id, userId: user.id, role: 'admin' },
  })

  const app = await db.app.upsert({
    where: { publicKey: 'wm_dev_fika' },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Fika (local)',
      origins: ['http://localhost:5174'],
      publicKey: 'wm_dev_fika',
    },
  })

  const existing = await db.flow.findFirst({ where: { appId: app.id, name: 'Change your grind' } })
  if (!existing) {
    await db.flow.create({
      data: {
        appId: app.id,
        name: 'Change your grind',
        description: 'Where to change how your coffee is ground.',
        steps: demoSteps,
        urlPatterns: ['/profile'],
        createdById: user.id,
      },
    })
  }

  console.log(`Seeded: organization "${organization.name}", app "${app.name}", 1 flow.`)
  console.log(`Sign in as ${user.email} with the password: ${DEV_PASSWORD}`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void db.$disconnect()
  })
