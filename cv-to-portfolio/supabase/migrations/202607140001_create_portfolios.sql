create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  title text not null default '' check (char_length(title) <= 160),
  theme_slug text not null check (char_length(theme_slug) between 1 and 80),
  theme_name text not null check (char_length(theme_name) between 1 and 120),
  html text not null check (char_length(html) between 1 and 300000),
  created_at timestamptz not null default now()
);

create index if not exists portfolios_created_at_idx
  on public.portfolios (created_at desc);

alter table public.portfolios enable row level security;

-- 브라우저가 Supabase를 직접 호출하지 못하게 하고 Express 서버만 접근한다.
revoke all on table public.portfolios from anon, authenticated;
grant select, insert on table public.portfolios to service_role;
