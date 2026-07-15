-- Migration: pgcrypto extension + handle_new_user() provisioning trigger
--
-- Task 2.7 — the thin raw-SQL layer that Drizzle cannot express. The
-- Drizzle-generated migration (./drizzle/0000_init_survival_study_schema.sql,
-- Task 2.6) is the single source of truth for the `public` tables; this file
-- is the authoritative source of truth for the Supabase-specific objects that
-- sit next to that schema (design.md → "Supabase 고유 요소" / "Migration 전략").
--
-- Objects managed here (all idempotent so re-applying converges the target):
--   1. pgcrypto extension (gen_random_uuid) in the `extensions` schema.
--   2. Cross-schema FK profiles.id -> auth.users(id) ON DELETE CASCADE — Drizzle
--      cannot reference the `auth` schema, so the FK lives here.
--   3. public.handle_new_user() — provisions a profile + zero-balance wallet.
--   4. on_auth_user_created trigger on auth.users (the ONLY permitted trigger).
--
-- Requirements traceability:
--   * 1.1  — every new account gets a matching zero-balance point_wallet.
--   * 11.4 — the inviter is recorded via profiles.invited_by from user metadata.

-- ---------------------------------------------------------------------------
-- 1) pgcrypto (gen_random_uuid)
--
-- Idempotent. The canonical/first enablement is
-- supabase/migrations/20250101000000_enable_extensions.sql, which must run
-- BEFORE the Drizzle schema migration because every table's uuid primary key
-- defaults to extensions.gen_random_uuid(). Re-asserting it here keeps this
-- migration self-contained and matches the design.md raw-SQL block.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 2) Cross-schema FK: profiles.id -> auth.users(id) ON DELETE CASCADE
--
-- profiles extends Supabase Auth's auth.users; deleting an auth user cascades
-- to their profile (and onward via public FKs). Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS" for foreign keys, so guard on any existing FK
-- from profiles(id) -> auth.users to stay idempotent.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and c.conkey = array[
        (select a.attnum
         from pg_attribute a
         where a.attrelid = 'public.profiles'::regclass
           and a.attname = 'id'
           and not a.attisdropped)
      ]
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) handle_new_user() — atomic account provisioning (Req 1.1, 11.4)
--
-- auth.users INSERT happens outside application control (Supabase Auth), so a
-- trigger provisions the profile + zero-balance wallet in the same statement.
-- This prevents "a user without a wallet" from ever existing. SECURITY DEFINER
-- with a pinned search_path so it runs regardless of the caller's role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, display_name, email, invited_by)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    nullif(new.raw_user_meta_data ->> 'invited_by', '')::uuid  -- Req 11.4
  );
  -- Req 1.1: every new account gets a zero-balance wallet.
  insert into public.point_wallets (user_id, balance) values (new.id, 0);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) on_auth_user_created — the ONLY permitted trigger (design.md Auth 전략)
--
-- Drop-and-recreate so re-applying always converges to this definition.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
