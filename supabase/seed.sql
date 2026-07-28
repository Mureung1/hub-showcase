-- Local development fixtures. Never reuse these credentials in production.
-- patient@admin.local  / admin123!
-- staff@admin.local    / admin123!
-- platform@admin.local / admin123!

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'patient@admin.local',
    crypt('admin123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"account_type":"patient","phone_number":"+821011112222"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'staff@admin.local',
    crypt('admin123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"account_type":"hospital_admin","phone_number":"+821033334444"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'platform@admin.local',
    crypt('admin123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"account_type":"platform_admin","phone_number":"+821055556666"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '{"sub":"20000000-0000-4000-8000-000000000001","email":"patient@admin.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '{"sub":"20000000-0000-4000-8000-000000000002","email":"staff@admin.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    '{"sub":"20000000-0000-4000-8000-000000000003","email":"platform@admin.local"}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    updated_at = now();

insert into public.profiles (id, phone_number, account_type, status)
values
  ('20000000-0000-4000-8000-000000000001', '+821011112222', 'patient', 'active'),
  ('20000000-0000-4000-8000-000000000002', '+821033334444', 'hospital_admin', 'active'),
  ('20000000-0000-4000-8000-000000000003', '+821055556666', 'platform_admin', 'active')
on conflict (id) do update
set phone_number = excluded.phone_number,
    account_type = excluded.account_type,
    status = excluded.status;

insert into public.hospitals (
  id,
  name,
  primary_department,
  phone_number,
  region_sido,
  region_sigungu,
  address,
  latitude,
  longitude,
  operating_hours_text,
  approval_status,
  approved_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  '서울이비인후과',
  '이비인후과',
  '+82212345678',
  '서울특별시',
  '마포구',
  '서울특별시 마포구 월드컵로 12, 2층',
  37.5012345,
  127.0398765,
  '평일 09:00-18:00 / 점심 13:00-14:00',
  'approved',
  now()
)
on conflict (id) do update
set name = excluded.name,
    primary_department = excluded.primary_department,
    phone_number = excluded.phone_number,
    region_sido = excluded.region_sido,
    region_sigungu = excluded.region_sigungu,
    address = excluded.address,
    operating_hours_text = excluded.operating_hours_text,
    approval_status = excluded.approval_status,
    approved_at = excluded.approved_at;

insert into public.hospital_members (id, hospital_id, account_id, role, status)
values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  'owner',
  'active'
)
on conflict (hospital_id, account_id) do update
set role = excluded.role,
    status = excluded.status;

insert into public.patient_category_sets (
  id,
  hospital_id,
  input_mode,
  effective_date,
  status
)
values (
  '12000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'categorized',
  current_date,
  'active'
)
on conflict (hospital_id, effective_date) do update
set input_mode = excluded.input_mode,
    status = excluded.status;

insert into public.patient_categories (id, category_set_id, name, description, sort_order)
values
  ('13000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '소아', '만 13세 미만', 0),
  ('13000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000001', '청소년', '만 13세 이상 19세 미만', 1),
  ('13000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000001', '성인', '만 19세 이상', 2)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.daily_queues (
  id,
  hospital_id,
  category_set_id,
  queue_date,
  status,
  opened_at
)
values (
  '14000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  current_date,
  'open',
  now()
)
on conflict (hospital_id, queue_date) do update
set category_set_id = excluded.category_set_id,
    status = excluded.status,
    opened_at = coalesce(public.daily_queues.opened_at, excluded.opened_at);

insert into public.waiting_entries (
  id,
  queue_id,
  account_id,
  source,
  phone_number,
  ticket_number,
  status,
  queue_order,
  patient_count
)
select fixture.id, queue.id, fixture.account_id, fixture.source, fixture.phone_number,
       fixture.ticket_number, fixture.status, fixture.queue_order, fixture.patient_count
from public.daily_queues as queue
cross join (
  values
    ('15000000-0000-4000-8000-000000000001'::uuid, null::uuid, 'onsite', '+821055550001', '1', 'onsite_waiting', 1, 4),
    ('15000000-0000-4000-8000-000000000002'::uuid, '20000000-0000-4000-8000-000000000001'::uuid, 'remote', '+821011112222', '2', 'remote_waiting', 2, 1),
    ('15000000-0000-4000-8000-000000000003'::uuid, null::uuid, 'onsite', '+821055550003', '3', 'onsite_waiting', 3, 2)
) as fixture(id, account_id, source, phone_number, ticket_number, status, queue_order, patient_count)
where queue.hospital_id = '10000000-0000-4000-8000-000000000001'
  and queue.queue_date = current_date
on conflict (id) do update
set queue_id = excluded.queue_id,
    account_id = excluded.account_id,
    source = excluded.source,
    phone_number = excluded.phone_number,
    ticket_number = excluded.ticket_number,
    status = excluded.status,
    queue_order = excluded.queue_order,
    patient_count = excluded.patient_count;

insert into public.waiting_entry_counts (waiting_entry_id, patient_category_id, count)
values
  ('15000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 1),
  ('15000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002', 1),
  ('15000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000003', 2),
  ('15000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000003', 1),
  ('15000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000001', 2)
on conflict (waiting_entry_id, patient_category_id) do update
set count = excluded.count;
