-- 0005: 조건 충족(트리거) 이벤트 이력 + 관망(hold) 1급 기록
-- 근거: docs/week2-plan.md IA 재편, docs/discord-linking.md(0004가 Discord 연동 선점)
--
-- 배경:
--   1) monitor는 조건 충족 시 conditions 행을 UPDATE만 해왔다(triggered_at 단일 컬럼,
--      매번 덮어씀 + delete_after_alert=true일 때만 기록). 종목 페이지 차트에 "조건 충족
--      시점"을 시계열 마커로 그리려면 이벤트 이력 테이블이 필요하다.
--   2) trades.side는 buy/sell만 허용해 "관망(진입 안 함)" 결정을 기록할 수 없었다.

-- 1) 조건 충족 이벤트 이력
create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  condition_id uuid references conditions(id) on delete set null,
  ticker text not null,
  market text not null check (market in ('KR','US')),
  price numeric,
  triggered_at timestamptz not null default now()
);
create index alerts_user_ticker_time_idx on alerts (user_id, ticker, triggered_at desc);

alter table alerts enable row level security;

create policy "alerts_select_own" on alerts
  for select using (auth.uid() = user_id);
-- insert는 monitor(service role)가 수행 — RLS를 우회하므로 별도 insert 정책 불필요.
-- 웹 클라이언트는 읽기 전용.

-- 2) 관망(hold) 1급 기록
-- (제약명이 원격에서 다를 수 있어 if exists 로 방어)
alter table trades drop constraint if exists trades_side_check;
alter table trades add constraint trades_side_check check (side in ('buy','sell','hold'));
-- price는 NOT NULL 유지: 웹 기록 폼은 관측가(최신 종가)를 자동 채우고,
-- Discord 관망 버튼도 custom_id에 알림 시점 현재가를 포함해 동일하게 채운다.
