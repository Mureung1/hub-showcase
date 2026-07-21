-- UniRadar saved notice sources, isolated per authenticated user.
-- Run after 20260720_auth_profiles.sql.

create table if not exists public.notice_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_url text not null,
  category text not null default '직접 추가',
  source_mode text not null default 'live' check (source_mode in ('live', 'manual')),
  link_selector text not null default 'a[href]',
  html_source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notice_sources_user_target_url_unique unique (user_id, target_url)
);

alter table public.notice_sources enable row level security;

drop policy if exists "notice_sources_select_own" on public.notice_sources;
drop policy if exists "notice_sources_insert_own" on public.notice_sources;
drop policy if exists "notice_sources_update_own" on public.notice_sources;
drop policy if exists "notice_sources_delete_own" on public.notice_sources;

create policy "notice_sources_select_own" on public.notice_sources for select using (auth.uid() = user_id);
create policy "notice_sources_insert_own" on public.notice_sources for insert with check (auth.uid() = user_id);
create policy "notice_sources_update_own" on public.notice_sources for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notice_sources_delete_own" on public.notice_sources for delete using (auth.uid() = user_id);

drop trigger if exists notice_sources_set_updated_at on public.notice_sources;
create trigger notice_sources_set_updated_at
before update on public.notice_sources
for each row execute function public.set_uniradar_updated_at();