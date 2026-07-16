-- Migration: RLS policies + Storage bucket/policies + v_leaderboard read model
--
-- Task 2.8 — the thin raw-SQL layer (design.md → "RLS 전략 (축소된 방어선)",
-- "Storage 전략", "Realtime & 게임화") that Drizzle cannot express. Applied
-- AFTER the Drizzle-generated schema (Task 2.6) and the pgcrypto +
-- handle_new_user migration (Task 2.7).
--
-- Security model (design.md → "RLS 전략"):
--   * ALL writes (money, points, state transitions) happen ONLY through the
--     server-side Drizzle transaction path, which connects as the `postgres`
--     role (BYPASSRLS + table owner) and is therefore UNAFFECTED by the RLS,
--     grant, and revoke changes below.
--   * anon / authenticated (Supabase JS / PostgREST / Realtime) get a
--     deny-by-default posture: RLS is enabled on every public table, all client
--     privileges are revoked, and only the minimal SELECT read paths are opened
--     back up via explicit grants + permissive SELECT policies. No client write
--     policy exists on any table, so every client write is denied.
--
-- Idempotent: re-applying converges the target (ENABLE RLS is a no-op when
-- already on, REVOKE/GRANT are declarative, DROP POLICY IF EXISTS before CREATE,
-- on-conflict bucket insert, CREATE OR REPLACE VIEW).
--
-- Requirements traceability:
--   * 1.5        — unauthenticated clients cannot join/create/verify/spend
--                  (all writes go through the server; clients have no write path).
--   * 2.1        — public (visibility='public') challenge list/detail is readable.
--   * 7.1        — Verification_Evidence upload restricted to the user's own
--                  Storage folder ({user_id}/{challenge_id}/{date}).
--   * 13.1, 13.2 — leaderboard / progress read model (participations,
--                  v_leaderboard) readable + Realtime-subscribable.
--   * 14.2       — point integrity: clients cannot write to wallet/ledger tables.

-- ===========================================================================
-- 1) deny-by-default: enable RLS + strip all client privileges
-- ===========================================================================
-- RLS is already auto-enabled by the platform `ensure_rls` event trigger when
-- Drizzle created these tables; re-assert here so the file is self-contained
-- and converges even if that trigger is ever absent.
-- NOTE: ENABLE (not FORCE) row level security so the owning `postgres` role
-- (the server write path) keeps bypassing RLS for the transaction functions.
alter table public.profiles              enable row level security;
alter table public.point_wallets         enable row level security;
alter table public.challenges            enable row level security;
alter table public.participations        enable row level security;
alter table public.daily_verifications   enable row level security;
alter table public.payment_transactions  enable row level security;
alter table public.point_transactions    enable row level security;
alter table public.reward_pools          enable row level security;
alter table public.settlements           enable row level security;
alter table public.badges                enable row level security;
alter table public.revival_tickets       enable row level security;
alter table public.surprise_missions     enable row level security;
alter table public.learning_reports      enable row level security;

-- Clients (anon/authenticated) get NOTHING by default. Every read path is then
-- re-opened explicitly below. Every write path stays closed (no grant + no
-- policy) — the money/point integrity backstop demanded by Requirement 14.2.
revoke all on all tables in schema public from anon, authenticated;

-- ===========================================================================
-- 2) SELECT read paths (the only client-reachable surfaces)
-- ===========================================================================
grant usage on schema public to anon, authenticated;

-- 2a) Public challenge list / detail (Req 2.1). Only visibility='public' rows.
grant select on public.challenges to anon, authenticated;
drop policy if exists challenges_public_select on public.challenges;
create policy challenges_public_select on public.challenges
  for select
  to anon, authenticated
  using (visibility = 'public');

-- 2b) Leaderboard / progress read model (Req 13.1, 13.2). Realtime subscribes to
--     `participations` for survival-status / alive-count updates, so the base
--     table itself needs a SELECT policy. The exposed columns are the
--     challenge-scoped game-ification data (status, streak); all writes remain
--     server-only.
grant select on public.participations to authenticated;
drop policy if exists participations_read_model_select on public.participations;
create policy participations_read_model_select on public.participations
  for select
  to authenticated
  using (true);

-- 2c) Own point wallet balance (Req 14.2 read side).
grant select on public.point_wallets to authenticated;
drop policy if exists point_wallets_own_select on public.point_wallets;
create policy point_wallets_own_select on public.point_wallets
  for select
  to authenticated
  using (user_id = auth.uid());

-- 2d) Own point ledger.
grant select on public.point_transactions to authenticated;
drop policy if exists point_transactions_own_select on public.point_transactions;
create policy point_transactions_own_select on public.point_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- 2e) Own daily verification records (Req 7.1 / 13.1). daily_verifications has
--     no user_id column — ownership is derived through the parent participation.
grant select on public.daily_verifications to authenticated;
drop policy if exists daily_verifications_own_select on public.daily_verifications;
create policy daily_verifications_own_select on public.daily_verifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.participations p
      where p.id = daily_verifications.participation_id
        and p.user_id = auth.uid()
    )
  );

-- NOTE (deny-by-default, no policy = no client access): profiles,
-- payment_transactions, reward_pools, settlements, badges, revival_tickets,
-- surprise_missions, learning_reports intentionally get NO client policy.
-- profiles.display_name reaches clients ONLY through the v_leaderboard read
-- model below (Req 13.2). Anything else is server-side read/write only.

-- ===========================================================================
-- 3) v_leaderboard read model view (Req 13.1, 13.2)
-- ===========================================================================
-- Ranks participants within a challenge by current_streak and exposes the live
-- alive_count. Matches design.md → "Realtime & 게임화". Owned by `postgres`
-- (BYPASSRLS) so the ranking/alive-count aggregate spans every participant of a
-- challenge; the view is exposed to clients via the grant below (read-only
-- game-ification surface).
create or replace view public.v_leaderboard as
select
  p.challenge_id,
  p.user_id,
  pr.display_name,
  p.survival_status,
  p.current_streak,
  rank() over (
    partition by p.challenge_id
    order by p.current_streak desc
  ) as rank,
  count(*) filter (where p.survival_status = 'alive') over (
    partition by p.challenge_id
  ) as alive_count
from public.participations p
join public.profiles pr on pr.id = p.user_id;

-- Supabase configures ALTER DEFAULT PRIVILEGES so objects newly created by
-- `postgres` are auto-granted to anon/authenticated. Strip those from the view
-- (it was created after the schema-wide REVOKE above) and re-open SELECT to
-- authenticated only — the leaderboard is an in-app (logged-in) read model.
revoke all on public.v_leaderboard from anon, authenticated;
grant select on public.v_leaderboard to authenticated;

-- ===========================================================================
-- 4) Private `evidence` Storage bucket + own-folder policies (Req 7.1)
-- ===========================================================================
-- Verification_Evidence lives in a PRIVATE bucket (public = false). Path
-- convention: {user_id}/{challenge_id}/{date}/<file>, so the FIRST path segment
-- is the owner's uid. Read/write is restricted to the authenticated user's own
-- top-level folder via (storage.foldername(name))[1] = auth.uid().
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

drop policy if exists "evidence own folder read" on storage.objects;
create policy "evidence own folder read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "evidence own folder insert" on storage.objects;
create policy "evidence own folder insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "evidence own folder update" on storage.objects;
create policy "evidence own folder update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "evidence own folder delete" on storage.objects;
create policy "evidence own folder delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
