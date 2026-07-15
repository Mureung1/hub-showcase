-- Migration: enable required PostgreSQL extensions
--
-- Establishes the extension foundation the rest of the schema depends on.
--   * pgcrypto  -> provides gen_random_uuid(), used as the default for every
--                  table's `id uuid` primary key (see design.md Data Models).
--
-- NOTE (architecture pivot): pg_cron has been removed. Recurring jobs (daily
-- elimination processing, auto-settlement) are now driven by Vercel Cron
-- calling protected Route Handlers, not by in-database scheduling. See
-- design.md "Scheduling 전략".
--
-- NOTE: the Drizzle-first data layer is the single source of truth for the
-- schema. Per design.md "Migration 전략", pgcrypto (and the handle_new_user
-- trigger) are reintroduced as thin raw SQL alongside the generated Drizzle
-- migrations in Task 2.7. This file retains only the pgcrypto capability so the
-- repository stays consistent after the hand-written schema migrations were
-- removed.
--
-- Requirements traceability: 14.1, 14.2, 14.3
--   The money/point integrity invariants are enforced at the DB level. This
--   migration only enables the extension that later migrations rely on.

-- Supabase convention: keep extensions out of the `public` schema.
create schema if not exists extensions;

-- gen_random_uuid() for uuid primary keys.
create extension if not exists pgcrypto with schema extensions;
