-- =========================================================
-- 관심종목 (대시보드 watchlist)
-- 종목을 즐겨찾기에 담아 시세 카드로 모니터링. roadmap.md §3 결정 2.
-- =========================================================
create table watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  symbol text not null,                 -- ticker (005930 / AAPL)
  market text not null check (market in ('KR','US')),
  exchange text,                        -- US 필수 (예: NASD)
  name text,                            -- 종목명 (표시용)
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);
create index on watchlists (user_id, created_at desc);

alter table watchlists enable row level security;

create policy "watchlists_select_own" on watchlists
  for select using (auth.uid() = user_id);
create policy "watchlists_insert_own" on watchlists
  for insert with check (auth.uid() = user_id);
create policy "watchlists_delete_own" on watchlists
  for delete using (auth.uid() = user_id);
