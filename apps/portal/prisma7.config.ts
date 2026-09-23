// Prisma CLI configuration: where the schema and migrations live, and how to
// reach the database. The app itself reads DATABASE_URL through lib/env.ts.
import 'dotenv/config'

import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
})
