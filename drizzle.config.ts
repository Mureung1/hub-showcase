import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration.
 *
 * The Drizzle schema (src/db/schema.ts) is the single source of truth for the
 * data layer. `drizzle-kit generate` (Task 2.6) reads it and emits SQL
 * migrations; those are applied to Postgres over a DIRECT (non-pooled)
 * connection — design.md → "Connection & Pooling 전략" / "Migration 전략".
 *
 * Migration output directory: `./drizzle` (dedicated).
 *   Rationale: drizzle-kit maintains its own migration journal
 *   (`meta/_journal.json`) whose format differs from Supabase CLI's flat
 *   `<timestamp>_name.sql` history. Keeping Drizzle-generated migrations in a
 *   separate `./drizzle` folder avoids clobbering Supabase's migration history
 *   in `supabase/migrations`, which continues to hold the thin raw-SQL
 *   migrations (pgcrypto + handle_new_user trigger, RLS, Storage, views —
 *   Tasks 2.7 / 2.8) that Drizzle cannot express.
 *
 * DB credentials: read from `DATABASE_DIRECT_URL` (direct connection). Loaded
 * from `.env.local`, consistent with tests/setup.ts. Secrets are never checked
 * in — see .env.example for the required key.
 *
 * Requirements traceability: 14.1, 14.2, 14.3
 */
config({ path: '.env.local' });

const url = process.env.DATABASE_DIRECT_URL;
if (!url) {
  throw new Error(
    'Missing required environment variable "DATABASE_DIRECT_URL". ' +
      'Set it to the DIRECT (non-pooled) Postgres connection string used for ' +
      'migrations (see .env.example).',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
  // Drizzle manages only the `public` schema. The `extensions` schema
  // (pgcrypto) and Supabase-owned schemas are handled by raw SQL migrations.
  schemaFilter: ['public'],
  strict: true,
  verbose: true,
});
