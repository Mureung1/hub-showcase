create table appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_start date not null,
  date_end date not null,
  time_start time not null,
  time_end time not null,
  deadline timestamptz,
  headcount integer not null check (headcount > 0),
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;
