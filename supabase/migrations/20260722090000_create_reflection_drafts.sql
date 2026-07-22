create table public.reflection_drafts (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null unique
    references public.analysis_results(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reflection_drafts_object
    check (jsonb_typeof(draft) = 'object')
);

create trigger reflection_drafts_set_updated_at
before update on public.reflection_drafts
for each row
execute function public.set_ptop_updated_at();

alter table public.reflection_drafts enable row level security;

grant select, insert, update, delete
on table public.reflection_drafts
to service_role;

revoke all
on table public.reflection_drafts
from anon, authenticated;

create index reflection_drafts_analysis_result_idx
  on public.reflection_drafts (analysis_result_id);

comment on table public.reflection_drafts is
  'User reflection draft collected during and after Repository analysis.';
