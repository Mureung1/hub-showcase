import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local', quiet: true })

const databaseUrl = process.env.DATABASE_URL?.trim()

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './api/_lib/db/schema.ts',
  strict: true,
  verbose: true,
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
})
