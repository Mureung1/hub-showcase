create table responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  date date not null,
  time time not null,
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  unique (participant_id, date, time)
);

alter table responses enable row level security;
