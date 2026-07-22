create table if not exists public.group_buy_votes (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id text not null,
  candidate text not null check (char_length(candidate) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_buy_id, user_id)
);

create index if not exists group_buy_votes_group_buy_id_idx
  on public.group_buy_votes (group_buy_id);

alter table public.group_buy_votes enable row level security;
revoke all on table public.group_buy_votes from anon, authenticated;
grant all on table public.group_buy_votes to service_role;

alter table public.group_buys
  add column if not exists final_pickup text check (final_pickup is null or char_length(final_pickup) between 1 and 80);
