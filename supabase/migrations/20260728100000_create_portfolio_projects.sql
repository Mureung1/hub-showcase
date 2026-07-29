create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_result_id uuid not null,
  repository_url text not null,
  repository_owner text not null,
  repository_name text not null,
  challenge_key text not null,
  challenge_title text not null,
  status text not null default 'draft_completed',
  portfolio_draft jsonb not null,
  analysis_result jsonb not null,
  reflection_draft jsonb not null,
  reflection_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_projects_status_valid
    check (status in ('draft_completed', 'needs_user_review')),
  constraint portfolio_projects_draft_object
    check (jsonb_typeof(portfolio_draft) = 'object'),
  constraint portfolio_projects_analysis_object
    check (jsonb_typeof(analysis_result) = 'object'),
  constraint portfolio_projects_reflection_object
    check (jsonb_typeof(reflection_draft) = 'object'),
  constraint portfolio_projects_reflection_analysis_object
    check (reflection_analysis is null or jsonb_typeof(reflection_analysis) = 'object'),
  constraint portfolio_projects_identity_unique
    unique (user_id, repository_url, challenge_key)
);

create index portfolio_projects_user_updated_idx
  on public.portfolio_projects (user_id, updated_at desc);

create index portfolio_projects_user_repository_idx
  on public.portfolio_projects (user_id, repository_url);

create trigger portfolio_projects_set_updated_at
before update on public.portfolio_projects
for each row
execute function public.set_ptop_updated_at();

alter table public.portfolio_projects enable row level security;

create policy "portfolio projects are readable by owner"
  on public.portfolio_projects
  for select
  using (auth.uid() = user_id);

create policy "portfolio projects are insertable by owner"
  on public.portfolio_projects
  for insert
  with check (auth.uid() = user_id);

create policy "portfolio projects are updatable by owner"
  on public.portfolio_projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "portfolio projects are deletable by owner"
  on public.portfolio_projects
  for delete
  using (auth.uid() = user_id);

comment on table public.portfolio_projects is
  'User-owned portfolio drafts displayed on the project room monitors.';

comment on column public.portfolio_projects.challenge_key is
  'Normalized technical challenge identity; same repository can have multiple saved challenges.';
