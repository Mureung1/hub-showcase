create table if not exists public.group_buys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in ('생활', '식품', '간식', '문구', '기타')),
  target_people integer not null check (target_people between 2 and 50),
  current_people integer not null default 1 check (current_people between 1 and target_people),
  deadline text not null check (char_length(deadline) between 1 and 60),
  pickup_location text not null check (char_length(pickup_location) between 1 and 80),
  status text not null default 'open' check (status in ('open', 'closed')),
  owner_id text not null,
  host_name text not null default '나',
  unit_price integer not null check (unit_price between 100 and 1000000),
  shipping_fee integer not null default 0 check (shipping_fee between 0 and 100000),
  stage text not null default '모집 중',
  created_at timestamptz not null default now()
);

create index if not exists group_buys_created_at_idx
  on public.group_buys (created_at desc);

alter table public.group_buys enable row level security;

grant all on table public.group_buys to service_role;
