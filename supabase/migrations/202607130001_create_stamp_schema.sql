create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  member_number text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stamp_goal integer not null check (stamp_goal > 0),
  reward_title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'owner')),
  customer_id uuid references public.customers (id) on delete set null,
  cafe_id uuid references public.cafes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_target_check check (
    (role = 'customer' and customer_id is not null and cafe_id is null)
    or
    (role = 'owner' and cafe_id is not null and customer_id is null)
  )
);

create table public.stamp_cards (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  stamp_count integer not null default 0 check (stamp_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, cafe_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  title text not null,
  barcode text not null unique,
  status text not null default 'issued' check (status in ('issued', 'used')),
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  cafe_id uuid references public.cafes (id) on delete set null,
  type text not null check (type in ('stamp_earned', 'coupon_issued')),
  message text not null,
  created_at timestamptz not null default now()
);
