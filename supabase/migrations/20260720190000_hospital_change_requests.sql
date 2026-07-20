create table public.hospital_change_requests (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  requested_by uuid not null references public.profiles (id),
  status varchar(20) not null default 'pending',
  current_values jsonb not null,
  proposed_values jsonb not null,
  reviewed_by uuid references public.profiles (id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint hospital_change_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint hospital_change_requests_review_check
    check (
      (status = 'pending' and reviewed_by is null and reviewed_at is null)
      or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
    )
);

create unique index hospital_change_requests_one_pending_per_hospital
  on public.hospital_change_requests (hospital_id)
  where status = 'pending';

create index hospital_change_requests_review_queue
  on public.hospital_change_requests (status, submitted_at);

alter table public.hospital_change_requests enable row level security;
revoke all on table public.hospital_change_requests from anon, authenticated;
