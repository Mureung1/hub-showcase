create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (length(trim(email)) > 0),
  name text not null check (length(trim(name)) > 0),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('OWNER', 'WORKER')),
  hourly_wage numeric(12, 2) check (hourly_wage is null or hourly_wage >= 0),
  default_work_start_time time,
  default_work_end_time time,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_members_unique_member unique (store_id, user_id),
  constraint store_members_default_time_order check (
    default_work_start_time is null
    or default_work_end_time is null
    or default_work_end_time > default_work_start_time
  )
);

create table if not exists public.store_invitations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invitee_email text not null check (length(trim(invitee_email)) > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete restrict,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  position text,
  memo text,
  source text not null default 'MANUAL' check (source in ('MANUAL', 'RECURRING', 'SUBSTITUTE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedules_time_order check (end_time > start_time)
);

create table if not exists public.recurring_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete restrict,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_schedule_rules_time_order check (end_time > start_time),
  constraint recurring_schedule_rules_date_order check (end_date is null or end_date >= start_date)
);

create table if not exists public.substitute_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  candidate_worker_id uuid references public.profiles(id) on delete restrict,
  status text not null default 'OPEN' check (status in ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED')),
  reason text,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint substitute_requests_status_candidate check (
    (status = 'OPEN' and candidate_worker_id is null)
    or status = 'CLOSED'
    or (status in ('PENDING_APPROVAL', 'APPROVED', 'REJECTED') and candidate_worker_id is not null)
  ),
  constraint substitute_requests_reject_reason check (
    status <> 'REJECTED'
    or reject_reason is not null
  )
);

create table if not exists public.substitute_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.substitute_requests(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint substitute_applications_unique_worker unique (request_id, worker_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (length(trim(type)) > 0),
  title text not null check (length(trim(title)) > 0),
  message text not null check (length(trim(message)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.work_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete restrict,
  schedule_id uuid references public.schedules(id) on delete set null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  hourly_wage numeric(12, 2) not null check (hourly_wage >= 0),
  created_at timestamptz not null default now(),
  constraint work_records_time_order check (end_time > start_time)
);

create unique index if not exists profiles_email_unique_idx on public.profiles(lower(email));
create index if not exists stores_owner_id_idx on public.stores(owner_id);
create index if not exists store_members_store_id_idx on public.store_members(store_id);
create index if not exists store_members_user_id_idx on public.store_members(user_id);
create index if not exists store_invitations_store_status_idx on public.store_invitations(store_id, status);
create index if not exists store_invitations_invitee_email_idx on public.store_invitations(lower(invitee_email));
create unique index if not exists store_invitations_unique_pending_invitee_idx
  on public.store_invitations(store_id, lower(invitee_email))
  where status = 'PENDING';
create index if not exists schedules_store_work_date_idx on public.schedules(store_id, work_date);
create index if not exists schedules_worker_work_date_idx on public.schedules(worker_id, work_date);
create index if not exists recurring_schedule_rules_store_id_idx on public.recurring_schedule_rules(store_id);
create index if not exists substitute_requests_store_status_created_at_idx on public.substitute_requests(store_id, status, created_at desc);
create index if not exists substitute_requests_schedule_id_idx on public.substitute_requests(schedule_id);
create index if not exists substitute_applications_request_created_at_idx on public.substitute_applications(request_id, created_at);
create index if not exists notifications_user_read_created_at_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists work_records_store_work_date_idx on public.work_records(store_id, work_date);
create index if not exists work_records_worker_work_date_idx on public.work_records(worker_id, work_date);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create trigger store_members_set_updated_at
before update on public.store_members
for each row execute function public.set_updated_at();

create trigger store_invitations_set_updated_at
before update on public.store_invitations
for each row execute function public.set_updated_at();

create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();

create trigger recurring_schedule_rules_set_updated_at
before update on public.recurring_schedule_rules
for each row execute function public.set_updated_at();

create trigger substitute_requests_set_updated_at
before update on public.substitute_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.store_invitations enable row level security;
alter table public.schedules enable row level security;
alter table public.recurring_schedule_rules enable row level security;
alter table public.substitute_requests enable row level security;
alter table public.substitute_applications enable row level security;
alter table public.notifications enable row level security;
alter table public.work_records enable row level security;
