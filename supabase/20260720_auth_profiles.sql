-- UniRadar authentication and user profile foundation
-- Run this file in the Supabase SQL Editor before enabling account profile storage.

create or replace function public.set_uniradar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school text,
  grade integer,
  majors jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,
  regions jsonb not null default '[]'::jsonb,
  can_join_team boolean,
  available_hours_per_week integer,
  gpa numeric,
  income_bracket integer,
  language_scores jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_grade_range check (grade is null or grade between 1 and 8),
  constraint profiles_hours_range check (available_hours_per_week is null or available_hours_per_week between 0 and 168),
  constraint profiles_gpa_range check (gpa is null or gpa between 0 and 4.5),
  constraint profiles_income_range check (income_bracket is null or income_bracket between 1 and 10)
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_uniradar_updated_at();

-- These tables are a schema-only foundation for this week's next tasks.
-- No application CRUD is connected to them yet.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recommendation_categories jsonb not null default '[]'::jsonb,
  preferred_regions jsonb not null default '[]'::jsonb,
  include_online boolean,
  minimum_match_score integer,
  auto_save_analyzed_notices boolean,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  source_name text,
  title text,
  organizer text,
  category text,
  deadline date,
  raw_text text,
  opportunity_json jsonb,
  match_json jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.saved_opportunities(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'todo',
  priority text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.user_settings enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.tasks enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['user_settings', 'saved_opportunities', 'tasks']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', table_name || '_delete_own', table_name);
  end loop;
end;
$$;
