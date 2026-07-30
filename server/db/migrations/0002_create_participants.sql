create table participants (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'participant')),
  created_at timestamptz not null default now(),
  unique (appointment_id, name)
);

alter table participants enable row level security;
