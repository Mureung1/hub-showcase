create table if not exists public.opportunity_analyses (
  id uuid primary key default gen_random_uuid(),
  analysis_id text not null unique,
  title text,
  organizer text,
  category text not null,
  deadline text,
  source_url text,
  analysis_result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_analyses_updated_at_idx
  on public.opportunity_analyses (updated_at desc);

alter table public.opportunity_analyses enable row level security;

