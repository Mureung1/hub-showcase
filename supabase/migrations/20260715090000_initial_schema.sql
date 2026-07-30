create extension if not exists pgcrypto;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id),
  phone_number varchar(16) not null unique,
  account_type varchar(20) not null,
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_number_e164_check
    check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_account_type_check
    check (account_type in ('patient', 'hospital_admin', 'platform_admin')),
  constraint profiles_status_check
    check (status in ('active', 'suspended', 'withdrawn'))
);

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  primary_department varchar(50) not null,
  phone_number varchar(16) not null,
  region_sido varchar(30) not null,
  region_sigungu varchar(30) not null,
  address text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  operating_hours_text text not null default '',
  approval_status varchar(20) not null default 'pending',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hospitals_phone_number_e164_check
    check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint hospitals_latitude_check
    check (latitude is null or latitude between -90 and 90),
  constraint hospitals_longitude_check
    check (longitude is null or longitude between -180 and 180),
  constraint hospitals_approval_status_check
    check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  constraint hospitals_approved_at_check
    check (
      (approval_status = 'approved' and approved_at is not null)
      or (approval_status in ('pending', 'rejected') and approved_at is null)
      or approval_status = 'suspended'
    )
);

create table public.hospital_inquiries (
  id uuid primary key default gen_random_uuid(),
  applicant_account_id uuid not null references public.profiles (id),
  hospital_id uuid unique references public.hospitals (id),
  hospital_name varchar(100) not null,
  primary_department varchar(50) not null,
  phone_number varchar(16) not null,
  region_sido varchar(30) not null,
  region_sigungu varchar(30) not null,
  address text not null,
  status varchar(20) not null default 'submitted',
  reviewed_by uuid references public.profiles (id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint hospital_inquiries_phone_number_e164_check
    check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint hospital_inquiries_status_check
    check (status in ('submitted', 'accepted', 'rejected', 'cancelled')),
  constraint hospital_inquiries_review_check
    check (
      (status = 'submitted' and hospital_id is null and reviewed_by is null and reviewed_at is null)
      or (status = 'accepted' and hospital_id is not null and reviewed_by is not null and reviewed_at is not null)
      or (status = 'rejected' and hospital_id is null and reviewed_by is not null and reviewed_at is not null)
      or (status = 'cancelled' and hospital_id is null and reviewed_by is null and reviewed_at is null)
    )
);

create table public.hospital_members (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  account_id uuid not null references public.profiles (id),
  role varchar(20) not null,
  status varchar(20) not null default 'active',
  created_at timestamptz not null default now(),
  constraint hospital_members_role_check
    check (role in ('owner', 'staff', 'viewer')),
  constraint hospital_members_status_check
    check (status in ('active', 'inactive')),
  constraint hospital_members_hospital_account_key
    unique (hospital_id, account_id)
);

create table public.hospital_applications (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  applicant_account_id uuid not null references public.profiles (id),
  business_registration_number varchar(20) not null,
  care_institution_code varchar(30) not null,
  representative_name varchar(100) not null,
  business_open_date date not null,
  status varchar(20) not null default 'pending',
  verification_provider varchar(30) not null default 'mock',
  verification_result jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.profiles (id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint hospital_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint hospital_applications_verification_provider_check
    check (verification_provider in ('mock', 'nts', 'hira', 'manual')),
  constraint hospital_applications_review_check
    check (
      (status = 'pending' and reviewed_by is null and reviewed_at is null)
      or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
    )
);

create table public.hospital_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.hospital_applications (id),
  document_type varchar(40) not null,
  storage_key varchar(255) not null unique,
  mime_type varchar(100) not null,
  file_size_bytes integer not null,
  scan_status varchar(20) not null default 'mock_safe',
  created_at timestamptz not null default now(),
  constraint hospital_documents_document_type_check
    check (document_type in ('business_certificate', 'medical_opening_certificate')),
  constraint hospital_documents_file_size_check
    check (file_size_bytes > 0),
  constraint hospital_documents_scan_status_check
    check (scan_status in ('pending', 'safe', 'rejected', 'mock_safe')),
  constraint hospital_documents_application_type_key
    unique (application_id, document_type)
);

create table public.patient_category_sets (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  input_mode varchar(20) not null,
  effective_date date not null,
  status varchar(20) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_category_sets_input_mode_check
    check (input_mode in ('categorized', 'total_only')),
  constraint patient_category_sets_status_check
    check (status in ('scheduled', 'active', 'retired')),
  constraint patient_category_sets_hospital_effective_date_key
    unique (hospital_id, effective_date)
);

create table public.patient_categories (
  id uuid primary key default gen_random_uuid(),
  category_set_id uuid not null references public.patient_category_sets (id),
  name varchar(20) not null,
  description varchar(50) not null default '',
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint patient_categories_sort_order_check
    check (sort_order between 0 and 4),
  constraint patient_categories_set_name_key
    unique (category_set_id, name),
  constraint patient_categories_set_sort_order_key
    unique (category_set_id, sort_order)
);

create table public.daily_queues (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  category_set_id uuid not null references public.patient_category_sets (id),
  queue_date date not null,
  status varchar(20) not null,
  average_minutes_per_patient integer not null default 10,
  preparation_threshold integer not null default 6,
  entry_threshold integer not null default 4,
  arrival_grace_minutes integer not null default 20,
  max_remote_waiting_patients integer not null default 20,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_queues_status_check
    check (status in ('open', 'paused', 'closed')),
  constraint daily_queues_average_minutes_check
    check (average_minutes_per_patient > 0 and average_minutes_per_patient % 5 = 0),
  constraint daily_queues_thresholds_check
    check (entry_threshold >= 1 and preparation_threshold > entry_threshold),
  constraint daily_queues_arrival_grace_check
    check (arrival_grace_minutes > 0),
  constraint daily_queues_remote_limit_check
    check (max_remote_waiting_patients > 0),
  constraint daily_queues_hospital_date_key
    unique (hospital_id, queue_date)
);

create table public.waiting_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.daily_queues (id),
  account_id uuid references public.profiles (id),
  source varchar(20) not null,
  phone_number varchar(16) not null,
  ticket_number varchar(30) not null,
  status varchar(30) not null,
  queue_order integer not null,
  patient_count integer not null,
  arrived_patient_count integer not null default 0,
  called_patient_count integer not null default 0,
  lookup_token_hash varchar(64) unique,
  patient_defer_count integer not null default 0,
  no_show_move_count integer not null default 0,
  preparation_notified_at timestamptz,
  onsite_near_turn_notified_at timestamptz,
  entry_requested_at timestamptz,
  arrival_deadline_at timestamptz,
  called_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waiting_entries_source_check
    check (source in ('remote', 'onsite')),
  constraint waiting_entries_phone_number_e164_check
    check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  constraint waiting_entries_status_check
    check (status in ('remote_waiting', 'entry_requested', 'onsite_waiting', 'held', 'called', 'cancelled')),
  constraint waiting_entries_queue_order_check
    check (queue_order > 0),
  constraint waiting_entries_patient_count_check
    check (patient_count between 1 and 9),
  constraint waiting_entries_arrived_patient_count_check
    check (arrived_patient_count between 0 and patient_count),
  constraint waiting_entries_called_patient_count_check
    check (called_patient_count between 0 and patient_count),
  constraint waiting_entries_patient_defer_count_check
    check (patient_defer_count between 0 and 1),
  constraint waiting_entries_no_show_move_count_check
    check (no_show_move_count between 0 and 1),
  constraint waiting_entries_source_account_check
    check (
      (source = 'remote' and account_id is not null)
      or source = 'onsite'
    ),
  constraint waiting_entries_queue_ticket_key
    unique (queue_id, ticket_number)
);

create table public.waiting_entry_counts (
  waiting_entry_id uuid not null references public.waiting_entries (id),
  patient_category_id uuid not null references public.patient_categories (id),
  count integer not null,
  primary key (waiting_entry_id, patient_category_id),
  constraint waiting_entry_counts_count_check
    check (count between 1 and 9)
);

create table public.waiting_events (
  id uuid primary key default gen_random_uuid(),
  waiting_entry_id uuid not null references public.waiting_entries (id),
  actor_account_id uuid references public.profiles (id),
  actor_type varchar(20) not null,
  event_type varchar(30) not null,
  from_status varchar(30),
  to_status varchar(30),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint waiting_events_actor_type_check
    check (actor_type in ('patient', 'staff', 'system')),
  constraint waiting_events_actor_account_check
    check (
      (actor_type = 'system' and actor_account_id is null)
      or (actor_type in ('patient', 'staff') and actor_account_id is not null)
    ),
  constraint waiting_events_from_status_check
    check (from_status is null or from_status in ('remote_waiting', 'entry_requested', 'onsite_waiting', 'held', 'called', 'cancelled')),
  constraint waiting_events_to_status_check
    check (to_status is null or to_status in ('remote_waiting', 'entry_requested', 'onsite_waiting', 'held', 'called', 'cancelled'))
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  waiting_entry_id uuid not null references public.waiting_entries (id),
  notification_type varchar(30) not null,
  provider varchar(30) not null default 'mock_kakao',
  delivery_status varchar(20) not null,
  template_code varchar(50) not null,
  provider_message_id varchar(100),
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_logs_type_check
    check (notification_type in ('remote_registered', 'onsite_registered', 'preparation', 'entry_requested', 'onsite_near_turn', 'cancelled', 'called')),
  constraint notification_logs_delivery_status_check
    check (delivery_status in ('pending', 'sent', 'failed')),
  constraint notification_logs_sent_at_check
    check (
      (delivery_status = 'pending' and sent_at is null)
      or (delivery_status in ('sent', 'failed') and sent_at is not null)
    )
);

create unique index hospital_inquiries_one_submitted_per_account_idx
  on public.hospital_inquiries (applicant_account_id)
  where status = 'submitted';

create index hospital_inquiries_status_submitted_at_idx
  on public.hospital_inquiries (status, submitted_at);

create unique index hospital_members_one_active_owner_idx
  on public.hospital_members (hospital_id)
  where role = 'owner' and status = 'active';

create unique index hospital_applications_one_pending_per_hospital_idx
  on public.hospital_applications (hospital_id)
  where status = 'pending';

create unique index hospital_applications_active_business_number_idx
  on public.hospital_applications (business_registration_number)
  where status in ('pending', 'approved');

create unique index hospital_applications_active_care_code_idx
  on public.hospital_applications (care_institution_code)
  where status in ('pending', 'approved');

create index hospital_applications_status_submitted_at_idx
  on public.hospital_applications (status, submitted_at);

create unique index patient_category_sets_one_scheduled_per_hospital_idx
  on public.patient_category_sets (hospital_id)
  where status = 'scheduled';

create index hospitals_approval_region_idx
  on public.hospitals (approval_status, region_sido, region_sigungu);

create index hospitals_primary_department_idx
  on public.hospitals (primary_department);

create unique index waiting_entries_active_queue_order_idx
  on public.waiting_entries (queue_id, queue_order)
  where status in ('remote_waiting', 'entry_requested', 'onsite_waiting');

create unique index waiting_entries_one_active_remote_per_account_idx
  on public.waiting_entries (account_id)
  where source = 'remote'
    and status in ('remote_waiting', 'entry_requested', 'onsite_waiting');

create index waiting_entries_queue_status_order_idx
  on public.waiting_entries (queue_id, status, queue_order);

create index waiting_entry_counts_category_idx
  on public.waiting_entry_counts (patient_category_id);

create index waiting_events_entry_created_at_idx
  on public.waiting_events (waiting_entry_id, created_at);

create index notification_logs_entry_created_at_idx
  on public.notification_logs (waiting_entry_id, created_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger hospitals_set_updated_at
before update on public.hospitals
for each row execute function public.set_updated_at();

create trigger patient_category_sets_set_updated_at
before update on public.patient_category_sets
for each row execute function public.set_updated_at();

create trigger daily_queues_set_updated_at
before update on public.daily_queues
for each row execute function public.set_updated_at();

create trigger waiting_entries_set_updated_at
before update on public.waiting_entries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.hospital_inquiries enable row level security;
alter table public.hospital_members enable row level security;
alter table public.hospital_applications enable row level security;
alter table public.hospital_documents enable row level security;
alter table public.patient_category_sets enable row level security;
alter table public.patient_categories enable row level security;
alter table public.daily_queues enable row level security;
alter table public.waiting_entries enable row level security;
alter table public.waiting_entry_counts enable row level security;
alter table public.waiting_events enable row level security;
alter table public.notification_logs enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.hospitals from anon, authenticated;
revoke all on table public.hospital_inquiries from anon, authenticated;
revoke all on table public.hospital_members from anon, authenticated;
revoke all on table public.hospital_applications from anon, authenticated;
revoke all on table public.hospital_documents from anon, authenticated;
revoke all on table public.patient_category_sets from anon, authenticated;
revoke all on table public.patient_categories from anon, authenticated;
revoke all on table public.daily_queues from anon, authenticated;
revoke all on table public.waiting_entries from anon, authenticated;
revoke all on table public.waiting_entry_counts from anon, authenticated;
revoke all on table public.waiting_events from anon, authenticated;
revoke all on table public.notification_logs from anon, authenticated;

comment on table public.hospital_inquiries is 'Logged-in clinic administrator onboarding inquiries reviewed by the minimal platform admin flow.';
comment on table public.hospital_applications is 'Detailed clinic verification applications submitted after an inquiry is accepted.';
comment on column public.profiles.phone_number is 'Korean phone number normalized to E.164 by Express before persistence.';
comment on column public.waiting_entries.patient_count is 'Server-calculated or server-validated patient total; clients do not set this persistence field directly.';
