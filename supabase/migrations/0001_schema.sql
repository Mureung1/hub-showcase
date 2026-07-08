-- Beacon 1단계 MVP 스키마
-- 근거: docs/prd.md §2 (데이터 모델) + docs/checklist.md Step 1 결정사항
--   - conditions.last_matched / last_alerted_at: 중복 알림 방지용 edge-trigger 상태
--   - symbols: 종목 마스터 (KIS_openapi/web/data/symbols 시드 대상)
--   - kis_token_cache: KIS OAuth 토큰 1행 캐시 (edge function stateless 대응)
-- 전 테이블 RLS 전제로 설계 (2단계 다중사용자 전환 비용 최소화, CLAUDE.md 컨벤션)

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- =========================================================
-- 사용자 (Supabase auth.users 확장)
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on profiles
  for delete using (auth.uid() = id);

-- =========================================================
-- Discord 연결
-- =========================================================
create table discord_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  discord_user_id text not null,
  notify_channel_id text,               -- 알림 발송 채널
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (discord_user_id)
);

alter table discord_links enable row level security;

create policy "discord_links_select_own" on discord_links
  for select using (auth.uid() = user_id);
create policy "discord_links_insert_own" on discord_links
  for insert with check (auth.uid() = user_id);
create policy "discord_links_update_own" on discord_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "discord_links_delete_own" on discord_links
  for delete using (auth.uid() = user_id);

-- =========================================================
-- 감시 조건 (portfolio.json 의 condition 을 정규화)
-- =========================================================
create table conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,                   -- 종목명 (표시용)
  ticker text not null,                 -- 005930 / AAPL
  market text not null check (market in ('KR','US')),
  exchange text,                        -- US 필수 (예: NASD)
  type text not null check (type in ('price','sma_cross')),
  operator text not null check (operator in ('>=','<=','>','<')),
  target numeric,                       -- type=price 일 때
  sma_window int check (sma_window in (20,60,240,480)), -- type=sma_cross 일 때
  status text not null default 'active' check (status in ('active','done','disabled')),
  delete_after_alert boolean not null default true,
  triggered_at timestamptz,
  last_matched boolean not null default false,  -- 직전 평가에서 조건 충족 여부 (edge-trigger 판정용)
  last_alerted_at timestamptz,                  -- 마지막 알림 발송 시각 (중복 알림 방지)
  created_at timestamptz not null default now()
);
create index on conditions (user_id, status);
create index on conditions (ticker);

alter table conditions enable row level security;

create policy "conditions_select_own" on conditions
  for select using (auth.uid() = user_id);
create policy "conditions_insert_own" on conditions
  for insert with check (auth.uid() = user_id);
create policy "conditions_update_own" on conditions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conditions_delete_own" on conditions
  for delete using (auth.uid() = user_id);

-- =========================================================
-- 매매 기록
-- =========================================================
create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null,
  market text not null check (market in ('KR','US')),
  side text not null check (side in ('buy','sell')),
  price numeric not null,
  quantity numeric,                     -- MVP 선택
  traded_at timestamptz not null default now(),
  memo text,
  source text not null default 'discord_button' check (source in ('discord_button','manual')),
  condition_id uuid references conditions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on trades (user_id, ticker, traded_at desc);

alter table trades enable row level security;

create policy "trades_select_own" on trades
  for select using (auth.uid() = user_id);
create policy "trades_insert_own" on trades
  for insert with check (auth.uid() = user_id);
create policy "trades_update_own" on trades
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trades_delete_own" on trades
  for delete using (auth.uid() = user_id);

-- =========================================================
-- AI 복기 결과
-- =========================================================
create table reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  headline text not null,               -- 한 줄 판단
  timing text,
  emotion text,
  repeated_mistake text,
  cited_trade_ids uuid[] not null default '{}',  -- 근거로 인용한 과거 매매
  raw jsonb,                            -- 에이전트 원응답 (감사/디버그)
  created_at timestamptz not null default now()
);
create index on reviews (trade_id);

alter table reviews enable row level security;

create policy "reviews_select_own" on reviews
  for select using (auth.uid() = user_id);
create policy "reviews_insert_own" on reviews
  for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_delete_own" on reviews
  for delete using (auth.uid() = user_id);

-- =========================================================
-- 종목 마스터 (KIS_openapi/web/data/symbols 시드 — 티커 검증/검색용)
-- =========================================================
create table symbols (
  market text not null check (market in ('KR','US')),
  exchange text not null,
  ticker text not null,
  name text not null,
  source text,
  primary key (market, exchange, ticker)
);
create index on symbols (ticker);
create index on symbols (lower(name));
create index symbols_name_trgm_idx on symbols using gin (name gin_trgm_ops);

alter table symbols enable row level security;

create policy "symbols_select_authenticated" on symbols
  for select to authenticated using (true);

-- =========================================================
-- KIS OAuth 토큰 캐시 (1행, edge function stateless 대응 — service role 전용)
-- =========================================================
create table kis_token_cache (
  id int primary key default 1 check (id = 1),
  access_token text not null,
  expires_at timestamptz not null,
  app_key_hash text not null,
  updated_at timestamptz not null default now()
);

alter table kis_token_cache enable row level security;
-- 정책 없음: service role 키로만 접근 (RLS는 service role을 우회하므로 anon/authenticated는 완전 차단됨)
