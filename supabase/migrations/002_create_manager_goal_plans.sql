create table if not exists public.manager_goal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  anonymous_session_id text null default 'local-dev',
  goal text not null,
  category text not null,
  status text not null default 'active',
  source text not null,
  fallback_reason text null,
  prompt_version text not null,
  plan_version integer not null default 1,
  plan_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manager_goal_plans_created_at_idx
  on public.manager_goal_plans (created_at desc);

create index if not exists manager_goal_plans_user_created_at_idx
  on public.manager_goal_plans (user_id, created_at desc);

create index if not exists manager_goal_plans_session_created_at_idx
  on public.manager_goal_plans (anonymous_session_id, created_at desc);

create table if not exists public.manager_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid null references public.manager_goal_plans(id) on delete set null,
  trigger_event_id uuid null references public.quest_logs(id) on delete set null,
  goal text not null,
  source text not null,
  fallback_reason text null,
  prompt_version text not null,
  revision_reason text not null,
  changes_json jsonb not null,
  after_plan_json jsonb not null,
  next_quest_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists manager_plan_revisions_plan_created_at_idx
  on public.manager_plan_revisions (plan_id, created_at desc);

create index if not exists manager_plan_revisions_trigger_event_idx
  on public.manager_plan_revisions (trigger_event_id);

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.manager_goal_plans to service_role;
grant select, insert, update, delete on table public.manager_plan_revisions to service_role;
