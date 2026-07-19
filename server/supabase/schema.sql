create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  raw_text text not null,
  emotion text not null,
  cause text not null,
  action text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.checkins enable row level security;

-- 감정 이모지 (선택 입력, 이모지 문자 자체를 저장)
alter table public.checkins add column if not exists mood text;
