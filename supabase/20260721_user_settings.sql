-- UniRadar user settings vertical slice
-- Run after 20260720_auth_profiles.sql in the Supabase SQL Editor.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recommendation_categories jsonb not null default '["scholarship", "contest", "activity", "internship", "research"]'::jsonb,
  preferred_regions jsonb not null default '[]'::jsonb,
  include_online boolean not null default true,
  minimum_match_score integer not null default 50,
  include_unknown_deadline boolean not null default true,
  auto_save_analyzed_opportunities boolean not null default false,
  recommendation_limit integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_minimum_match_score_range check (minimum_match_score between 0 and 100),
  constraint user_settings_recommendation_limit_range check (recommendation_limit between 1 and 50)
);

-- Upgrade the initial schema safely when this table already exists.
alter table public.user_settings add column if not exists include_unknown_deadline boolean;
alter table public.user_settings add column if not exists auto_save_analyzed_notices boolean;
alter table public.user_settings add column if not exists auto_save_analyzed_opportunities boolean;
alter table public.user_settings add column if not exists recommendation_limit integer;
alter table public.user_settings add column if not exists created_at timestamptz;
alter table public.user_settings add column if not exists updated_at timestamptz;

update public.user_settings
set
  recommendation_categories = '["scholarship", "contest", "activity", "internship", "research"]'::jsonb,
  preferred_regions = coalesce(preferred_regions, '[]'::jsonb),
  include_online = coalesce(include_online, true),
  minimum_match_score = coalesce(minimum_match_score, 50),
  include_unknown_deadline = coalesce(include_unknown_deadline, true),
  auto_save_analyzed_opportunities = coalesce(auto_save_analyzed_opportunities, auto_save_analyzed_notices, false),
  recommendation_limit = coalesce(recommendation_limit, 10),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where recommendation_categories is null
  or recommendation_categories = '[]'::jsonb
  or preferred_regions is null
  or include_online is null
  or minimum_match_score is null
  or include_unknown_deadline is null
  or auto_save_analyzed_opportunities is null
  or recommendation_limit is null
  or created_at is null
  or updated_at is null;

alter table public.user_settings
  alter column recommendation_categories set default '["scholarship", "contest", "activity", "internship", "research"]'::jsonb,
  alter column recommendation_categories set not null,
  alter column preferred_regions set default '[]'::jsonb,
  alter column preferred_regions set not null,
  alter column include_online set default true,
  alter column include_online set not null,
  alter column minimum_match_score set default 50,
  alter column minimum_match_score set not null,
  alter column include_unknown_deadline set default true,
  alter column include_unknown_deadline set not null,
  alter column auto_save_analyzed_opportunities set default false,
  alter column auto_save_analyzed_opportunities set not null,
  alter column recommendation_limit set default 10,
  alter column recommendation_limit set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.user_settings
  drop constraint if exists user_settings_minimum_match_score_range,
  add constraint user_settings_minimum_match_score_range check (minimum_match_score between 0 and 100),
  drop constraint if exists user_settings_recommendation_limit_range,
  add constraint user_settings_recommendation_limit_range check (recommendation_limit between 1 and 50);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "user_settings_delete_own" on public.user_settings;

create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_delete_own" on public.user_settings for delete using (auth.uid() = user_id);

create or replace function public.set_uniradar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_uniradar_updated_at();