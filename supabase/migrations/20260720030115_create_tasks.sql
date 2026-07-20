create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  title text not null,
  assignee_id text not null,
  due_date date not null,
  status text not null default 'not_started',
  description text,
  created_at timestamptz not null default now(),
  constraint tasks_title_length_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint tasks_status_check
    check (status in ('not_started', 'in_progress', 'in_review', 'completed')),
  constraint tasks_description_length_check
    check (description is null or char_length(description) <= 2000)
);

create index tasks_project_created_at_idx
  on public.tasks (project_id, created_at desc);

alter table public.tasks enable row level security;

revoke all privileges on table public.tasks from public, anon, authenticated, service_role;
grant usage on schema public to service_role;
grant select, insert on table public.tasks to service_role;
