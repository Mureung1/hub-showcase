-- Template for connecting Supabase Auth users to demo profiles.
-- Do not commit real passwords or secret keys.
--
-- How to use:
-- 1. Create pilot users in Supabase Dashboard > Authentication > Users.
-- 2. Copy each user's Auth UID.
-- 3. Replace the placeholder UUID values below.
-- 4. Run only the statements you have filled in.

-- Customer profile for Demo Customer General (member number C-1001)
insert into public.profiles (id, role, customer_id)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  'customer',
  customers.id
from public.customers
where customers.member_number = 'C-1001'
on conflict (id) do update
set
  role = excluded.role,
  customer_id = excluded.customer_id,
  cafe_id = null,
  updated_at = now();

-- Optional second customer profile for Demo Customer Reward Ready (member number C-1002)
insert into public.profiles (id, role, customer_id)
select
  '00000000-0000-0000-0000-000000000002'::uuid,
  'customer',
  customers.id
from public.customers
where customers.member_number = 'C-1002'
on conflict (id) do update
set
  role = excluded.role,
  customer_id = excluded.customer_id,
  cafe_id = null,
  updated_at = now();

-- Owner profile for the Mellow Brew pilot cafe
insert into public.profiles (id, role, cafe_id)
select
  '00000000-0000-0000-0000-000000000003'::uuid,
  'owner',
  cafes.id
from public.cafes
where cafes.name = 'Mellow Brew'
on conflict (id) do update
set
  role = excluded.role,
  customer_id = null,
  cafe_id = excluded.cafe_id,
  updated_at = now();