alter table public.portfolio_projects
  add column if not exists workspace_slot integer;

with ranked_projects as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, id
    ) - 1 as slot
  from public.portfolio_projects
)
update public.portfolio_projects as project
set workspace_slot = ranked_projects.slot
from ranked_projects
where project.id = ranked_projects.id
  and ranked_projects.slot < 8
  and project.workspace_slot is null;

alter table public.portfolio_projects
  drop constraint if exists portfolio_projects_workspace_slot_valid;

alter table public.portfolio_projects
  add constraint portfolio_projects_workspace_slot_valid
  check (workspace_slot is null or workspace_slot between 0 and 7);

create unique index if not exists portfolio_projects_user_workspace_slot_idx
  on public.portfolio_projects (user_id, workspace_slot)
  where workspace_slot is not null;

comment on column public.portfolio_projects.workspace_slot is
  'Stable project-room monitor slot. Existing rows are backfilled once; new rows use an unused slot.';
